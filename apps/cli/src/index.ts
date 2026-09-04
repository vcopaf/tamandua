import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createProject,
  renderHtmlReport,
  renderJsonReport,
  renderMarkdownReport,
  startSession,
} from "@tamandua/core";
import { createDatabase, createRepositories } from "@tamandua/persistence";
import { loadScenario, runScenario } from "@tamandua/runner";
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
    if (!project.baseUrl)
      throw new Error("Project needs a base URL to start a CLI session");
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
    const project = await repositories.projects.findById(session.projectId);
    if (!project) throw new Error("Project not found");
    const findings = await repositories.findings.listBySession(sessionId);
    await mkdir(join(root, "sessions", sessionId, "reports"), {
      recursive: true,
    });
    const report = { project, session, findings };
    const reportsDirectory = join(root, "sessions", sessionId, "reports");
    await Promise.all([
      writeFile(
        join(reportsDirectory, "report.json"),
        renderJsonReport(report),
      ),
      writeFile(
        join(reportsDirectory, "report.md"),
        renderMarkdownReport(report),
      ),
      writeFile(
        join(reportsDirectory, "report.html"),
        renderHtmlReport(report),
      ),
    ]);
    return console.log(reportsDirectory);
  }
  if (args[0] === "run") {
    const projectId = args[args.indexOf("--project") + 1];
    const scenarioPath = args[args.indexOf("--scenario") + 1];
    if (!projectId || !scenarioPath)
      throw new Error(
        "Usage: tamandua run --project <id> --scenario <file.yml>",
      );
    const project = await repositories.projects.findById(projectId);
    if (!project) throw new Error("Project not found");
    if (!project.baseUrl)
      throw new Error("Project needs a base URL to run a scenario");
    const scenarioFile = await loadScenario(scenarioPath);
    const execution = await runScenario(
      { ...scenarioFile, id: scenarioPath, projectId },
      { baseUrl: project.baseUrl, outputDirectory: join(root, "runs") },
    );
    return console.log(JSON.stringify(execution, null, 2));
  }
  throw new Error("Unknown command. Use project, session, report or start.");
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
