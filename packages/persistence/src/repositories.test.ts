import { createFinding, createProject, startSession } from "@tamandua/core";
import { describe, expect, it } from "vitest";
import { createDatabase } from "./database.js";
import { createRepositories } from "./repositories.js";

describe("SQLite repositories", () => {
  it("persists projects, sessions and findings", async () => {
    const handle = await createDatabase();
    const repositories = createRepositories(handle);
    const baseUrl = "https://example.test";
    const project = createProject({
      name: "Demo",
      baseUrl,
      environment: "test",
      language: "es-BO",
    });
    const session = startSession({
      projectId: project.id,
      mode: "manual",
      browser: "Chromium",
      resolution: "1280x720",
      initialUrl: baseUrl,
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
      url: baseUrl,
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
    await repositories.globalLinguisticIgnores.save({
      language: "es-BO",
      term: "AGETIC",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await repositories.sessions.save(session);
    await repositories.sessionPages.record({
      id: "page-1",
      sessionId: session.id,
      url: "https://example.test/registro",
      title: "Registro",
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-01-01T00:00:00.000Z",
      analysisCount: 1,
    });
    await repositories.sessionPages.record({
      id: "page-2",
      sessionId: session.id,
      url: "https://example.test/registro",
      title: "Registro actualizado",
      firstSeenAt: "2026-01-01T00:01:00.000Z",
      lastSeenAt: "2026-01-01T00:01:00.000Z",
      analysisCount: 1,
    });
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
    expect(
      (await repositories.sessionPages.listBySession(session.id))[0],
    ).toMatchObject({ title: "Registro actualizado", analysisCount: 2 });
    expect(
      (await repositories.globalLinguisticIgnores.listByLanguage("es-BO"))[0]
        ?.term,
    ).toBe("AGETIC");
    expect((await repositories.findings.findById(finding.id))?.status).toBe(
      "candidate",
    );
    handle.client.close();
  });
});
