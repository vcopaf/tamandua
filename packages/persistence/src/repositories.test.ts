import { createFinding, createProject, startSession } from "@tamandua/core";
import { describe, expect, it } from "vitest";
import { createDatabase } from "./database.js";
import { createRepositories } from "./repositories.js";

describe("SQLite repositories", () => {
  it("persists projects, sessions and findings", async () => {
    const handle = await createDatabase();
    const repositories = createRepositories(handle);
    const project = createProject({
      name: "Demo",
      baseUrl: "https://example.test",
      environment: "test",
      language: "es-BO",
    });
    const session = startSession({
      projectId: project.id,
      mode: "manual",
      browser: "Chromium",
      resolution: "1280x720",
      initialUrl: project.baseUrl,
    });
    const finding = createFinding({
      sessionId: session.id,
      origin: "rule",
      category: "form",
      title: "Campo sin label",
      description: "Falta una etiqueta.",
      severity: "major",
      priority: "high",
      confidence: 1,
      url: project.baseUrl,
    });

    await repositories.projects.save(project);
    await repositories.projectContexts.save({
      projectId: project.id,
      primaryLanguage: "es-BO",
      enabledLanguages: ["es-BO"],
      ignoredTerms: ["AGETIC"],
      preferredTerms: { clickear: "hacer clic" },
      excludedSelectors: ["pre"],
      reviewerNotes: "Usar terminología institucional.",
    });
    await repositories.sessions.save(session);
    await repositories.findings.save(finding);

    expect((await repositories.projects.findById(project.id))?.name).toBe(
      "Demo",
    );
    expect((await repositories.sessions.findById(session.id))?.status).toBe(
      "active",
    );
    expect(
      (await repositories.projectContexts.findByProjectId(project.id))
        ?.preferredTerms.clickear,
    ).toBe("hacer clic");
    expect((await repositories.findings.findById(finding.id))?.status).toBe(
      "candidate",
    );
    handle.client.close();
  });
});
