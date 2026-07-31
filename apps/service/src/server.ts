import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer,
} from "node:http";
import { dirname, join } from "node:path";
import {
  DomainError,
  analyzeSnapshot,
  closeSession,
  createFinding,
  createId,
  createProject,
  elementSnapshotSchema,
  pageSnapshotSchema,
  startSession,
  updateFinding,
  updateFindingStatus,
} from "@tamandua/core";
import type { Evidence } from "@tamandua/core";
import { createDatabase } from "@tamandua/persistence";
import { createRepositories } from "@tamandua/persistence";
import { z } from "zod";

const projectInput = z.object({
  name: z.string(),
  description: z.string().optional(),
  baseUrl: z.string().url(),
  environment: z.string(),
  language: z.string(),
});
const sessionInput = z.object({
  projectId: z.string().min(1),
  mode: z.enum(["manual", "automatic"]),
  browser: z.string().min(1),
  resolution: z.string().min(1),
  initialUrl: z.string().url(),
});
const evidenceInput = z.object({
  findingId: z.string().min(1),
  type: z.enum(["element-screenshot", "full-page-screenshot"]),
  dataUrl: z.string().regex(/^data:image\/(png|jpeg);base64,/),
  url: z.string().url(),
  browser: z.string().min(1),
  resolution: z.string().min(1),
  selector: z.string().optional(),
});
const findingCreateInput = z.object({
  sessionId: z.string().min(1),
  origin: z.enum(["manual", "automatic", "rule", "user"]),
  ruleId: z.string().optional(),
  category: z.enum([
    "form",
    "content",
    "accessibility",
    "technical",
    "functional",
    "other",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  actualResult: z.string().optional(),
  expectedResult: z.string().optional(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]),
  priority: z.enum(["high", "medium", "low"]),
  confidence: z.number().min(0).max(1),
  url: z.string().url(),
  element: elementSnapshotSchema.optional(),
});
const findingPatchInput = z.object({
  status: z
    .enum(["confirmed", "discarded", "duplicate", "resolved"])
    .optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  actualResult: z.string().optional(),
  expectedResult: z.string().optional(),
  severity: z
    .enum(["blocker", "critical", "major", "minor", "trivial"])
    .optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

async function body(request: IncomingMessage) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ServiceError(
      400,
      "Request body must be valid JSON",
      "INVALID_JSON",
    );
  }
}

function send(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
}

export async function createApp(
  database?: Awaited<ReturnType<typeof createDatabase>>,
) {
  const repositories = createRepositories(database ?? (await createDatabase()));
  return createServer(async (request, response) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    response.once("finish", () => {
      console.info(
        JSON.stringify({
          event: "http_request",
          requestId,
          method: request.method,
          path: new URL(request.url ?? "/", "http://127.0.0.1").pathname,
          status: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        }),
      );
    });
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "OPTIONS") return send(response, 204, null);
      if (request.method === "GET" && url.pathname === "/health")
        return send(response, 200, { status: "ok", service: "tamandua" });
      if (request.method === "GET" && url.pathname === "/projects")
        return send(response, 200, await repositories.projects.list());
      if (request.method === "POST" && url.pathname === "/projects") {
        const project = createProject(projectInput.parse(await body(request)));
        return send(response, 201, await repositories.projects.save(project));
      }
      if (request.method === "GET" && url.pathname === "/sessions")
        return send(response, 200, await repositories.sessions.list());
      if (request.method === "POST" && url.pathname === "/snapshots") {
        const snapshot = pageSnapshotSchema.parse(await body(request));
        return send(response, 202, {
          accepted: true,
          snapshot: { url: snapshot.url, title: snapshot.title },
        });
      }
      if (request.method === "POST" && url.pathname === "/analyze")
        return send(response, 200, {
          findings: analyzeSnapshot(
            pageSnapshotSchema.parse(await body(request)),
          ),
        });
      if (request.method === "POST" && url.pathname === "/findings") {
        const input = findingCreateInput.parse(await body(request));
        if (!(await repositories.sessions.findById(input.sessionId)))
          throw new ServiceError(404, "Session not found", "SESSION_NOT_FOUND");
        return send(
          response,
          201,
          await repositories.findings.save(createFinding(input)),
        );
      }
      const findingMatch = url.pathname.match(/^\/findings\/([^/]+)$/);
      if (
        findingMatch &&
        (request.method === "GET" || request.method === "PATCH")
      ) {
        const findingId = findingMatch[1];
        if (!findingId)
          throw new ServiceError(400, "Invalid finding id", "INVALID_ID");
        const finding = await repositories.findings.findById(findingId);
        if (!finding)
          throw new ServiceError(404, "Finding not found", "FINDING_NOT_FOUND");
        if (request.method === "GET") return send(response, 200, finding);
        const { status, ...patch } = findingPatchInput.parse(
          await body(request),
        );
        const fields = {
          ...(patch.title === undefined ? {} : { title: patch.title }),
          ...(patch.description === undefined
            ? {}
            : { description: patch.description }),
          ...(patch.actualResult === undefined
            ? {}
            : { actualResult: patch.actualResult }),
          ...(patch.expectedResult === undefined
            ? {}
            : { expectedResult: patch.expectedResult }),
          ...(patch.severity === undefined ? {} : { severity: patch.severity }),
          ...(patch.priority === undefined ? {} : { priority: patch.priority }),
        };
        const edited = updateFinding(finding, fields);
        const changed = status ? updateFindingStatus(edited, status) : edited;
        return send(response, 200, await repositories.findings.update(changed));
      }
      if (request.method === "POST" && url.pathname === "/evidence") {
        const input = evidenceInput.parse(await body(request));
        const handle = await repositories.findings.findById(input.findingId);
        if (!handle)
          throw new ServiceError(404, "Finding not found", "FINDING_NOT_FOUND");
        const extension = input.dataUrl.startsWith("data:image/jpeg")
          ? "jpg"
          : "png";
        const directory = join(
          process.env.HOME ?? ".",
          ".tamandua",
          "sessions",
          input.findingId,
          "screenshots",
        );
        await mkdir(directory, { recursive: true });
        const originalPath = join(directory, `original.${extension}`);
        await writeFile(
          originalPath,
          Buffer.from(input.dataUrl.split(",")[1] ?? "", "base64"),
        );
        const evidence: Evidence = {
          id: createId(),
          findingId: input.findingId,
          type: input.type,
          originalPath,
          url: input.url,
          capturedAt: new Date().toISOString(),
          browser: input.browser,
          resolution: input.resolution,
          ...(input.selector ? { selector: input.selector } : {}),
        };
        return send(response, 201, await repositories.evidence.save(evidence));
      }
      if (request.method === "POST" && url.pathname === "/sessions") {
        const input = sessionInput.parse(await body(request));
        if (!(await repositories.projects.findById(input.projectId)))
          throw new ServiceError(404, "Project not found", "PROJECT_NOT_FOUND");
        return send(
          response,
          201,
          await repositories.sessions.save(startSession(input)),
        );
      }
      const sessionMatch = url.pathname.match(/^\/sessions\/([^/]+)$/);
      if (request.method === "GET" && sessionMatch) {
        const sessionId = sessionMatch[1];
        if (!sessionId)
          throw new ServiceError(400, "Invalid session id", "INVALID_ID");
        const session = await repositories.sessions.findById(sessionId);
        if (!session)
          throw new ServiceError(404, "Session not found", "SESSION_NOT_FOUND");
        return send(response, 200, session);
      }
      const closeSessionMatch = url.pathname.match(
        /^\/sessions\/([^/]+)\/close$/,
      );
      if (request.method === "POST" && closeSessionMatch) {
        const sessionId = closeSessionMatch[1];
        if (!sessionId)
          throw new ServiceError(400, "Invalid session id", "INVALID_ID");
        const session = await repositories.sessions.findById(sessionId);
        if (!session)
          throw new ServiceError(404, "Session not found", "SESSION_NOT_FOUND");
        return send(
          response,
          200,
          await repositories.sessions.update(closeSession(session)),
        );
      }
      const findingsMatch = url.pathname.match(
        /^\/sessions\/([^/]+)\/findings$/,
      );
      if (request.method === "GET" && findingsMatch) {
        const sessionId = findingsMatch[1];
        if (!sessionId)
          throw new ServiceError(400, "Invalid session id", "INVALID_ID");
        return send(
          response,
          200,
          await repositories.findings.listBySession(sessionId),
        );
      }
      throw new ServiceError(404, "Route not found", "NOT_FOUND");
    } catch (error) {
      if (error instanceof DomainError)
        return send(response, 409, {
          error: { code: "INVALID_STATE", message: error.message },
        });
      if (error instanceof z.ZodError)
        return send(response, 400, {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message ?? "Invalid input",
          },
        });
      if (error instanceof ServiceError)
        return send(response, error.statusCode, {
          error: { code: error.code, message: error.message },
        });
      return send(response, 500, {
        error: { code: "INTERNAL_ERROR", message: "Internal service error" },
      });
    }
  });
}

export async function startServer(port = 4317): Promise<Server> {
  const filename = `${process.env.HOME ?? "."}/.tamandua/tamandua.db`;
  await mkdir(dirname(filename), { recursive: true });
  const app = await createApp(await createDatabase(filename));
  return new Promise<Server>((resolve) =>
    app.listen(port, "127.0.0.1", () => resolve(app)),
  );
}
