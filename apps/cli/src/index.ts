import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createProject, startSession } from "@tamandua/core";
import { createDatabase, createRepositories } from "@tamandua/persistence";
import { startServer } from "@tamandua/service/server.js";

const root = join(homedir(), ".tamandua");
const database = join(root, "tamandua.db");

async function main(args: string[]) {
  if (args[0] === "start") {
    await startServer(Number(process.env.TAMANDUA_PORT ?? 4317));
    console.log("Tamanduá service listening on http://127.0.0.1:4317");
    return;
  }
  const handle = await createDatabase(database);
  const repositories = createRepositories(handle);
  if (args[0] === "project" && args[1] === "list")
    return console.log(
      JSON.stringify(await repositories.projects.list(), null, 2),
    );
  if (args[0] === "project" && args[1] === "create") {
    const name = args[2];
    if (!name)
      throw new Error("Usage: tamandua project create <name> --url <baseUrl>");
    const urlIndex = args.indexOf("--url");
    const baseUrl = args[urlIndex + 1];
    if (!baseUrl) throw new Error("Missing --url");
    const project = await repositories.projects.save(
      createProject({
        name,
        baseUrl,
        environment: "testing",
        language: "es-BO",
      }),
    );
    return console.log(JSON.stringify(project, null, 2));
  }
  if (args[0] === "session" && args[1] === "list")
    return console.log(
      JSON.stringify(await repositories.sessions.list(), null, 2),
    );
  if (args[0] === "session" && args[1] === "start") {
    const projectIndex = args.indexOf("--project");
    const projectId = args[projectIndex + 1];
    if (!projectId) throw new Error("Missing --project");
    const project = await repositories.projects.findById(projectId);
    if (!project) throw new Error("Project not found");
    const session = await repositories.sessions.save(
      startSession({
        projectId,
        mode:
          args.includes("--mode") &&
          args[args.indexOf("--mode") + 1] === "automatic"
            ? "automatic"
            : "manual",
        browser: "Chromium",
        resolution: "unknown",
        initialUrl: project.baseUrl,
      }),
    );
    return console.log(JSON.stringify(session, null, 2));
  }
  if (args[0] === "report" && args[1] === "generate") {
    const sessionId = args[2];
    if (!sessionId) throw new Error("Missing session id");
    const session = await repositories.sessions.findById(sessionId);
    if (!session) throw new Error("Session not found");
    const findings = await repositories.findings.listBySession(sessionId);
    await mkdir(join(root, "sessions", sessionId, "reports"), {
      recursive: true,
    });
    const report = { session, findings };
    const output = join(root, "sessions", sessionId, "reports", "report.json");
    await writeFile(output, JSON.stringify(report, null, 2));
    return console.log(output);
  }
  throw new Error("Unknown command. Use project, session, report or start.");
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
