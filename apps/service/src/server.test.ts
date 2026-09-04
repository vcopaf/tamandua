import { createDatabase } from "@tamandua/persistence";
import { describe, expect, it } from "vitest";
import { createApp } from "./server.js";

describe("local service", () => {
  it("reports health and validates project requests", async () => {
    const app = await createApp(await createDatabase());
    await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
    const address = app.address();
    if (!address || typeof address === "string")
      throw new Error("Server did not bind");

    const health = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok", service: "tamandua" });

    const invalid = await fetch(`http://127.0.0.1:${address.port}/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Invalid" }),
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
    const projectWithoutUrl = await fetch(
      `http://127.0.0.1:${address.port}/projects`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Proyecto sin URL",
          environment: "manual",
          language: "es-BO",
        }),
      },
    );
    expect(projectWithoutUrl.status).toBe(201);
    expect((await projectWithoutUrl.json()).baseUrl).toBeUndefined();
    await new Promise<void>((resolve, reject) =>
      app.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("completes the project, session and finding review flow", async () => {
    const app = await createApp(await createDatabase());
    await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
    const address = app.address();
    if (!address || typeof address === "string")
      throw new Error("Server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    const projectResponse = await fetch(`${base}/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Demo",
        baseUrl: "https://example.test",
        environment: "testing",
        language: "es-BO",
      }),
    });
    const project = (await projectResponse.json()) as {
      id: string;
      baseUrl: string;
    };
    const contextResponse = await fetch(
      `${base}/projects/${project.id}/context`,
    );
    expect((await contextResponse.json()).primaryLanguage).toBe("es-BO");
    const savedContext = await fetch(`${base}/projects/${project.id}/context`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        primaryLanguage: "es-BO",
        enabledLanguages: ["es-BO"],
        ignoredTerms: ["AGETIC"],
        preferredTerms: { clickear: "hacer clic" },
        excludedSelectors: ["pre"],
        reviewerNotes: "Portal ciudadano.",
      }),
    });
    expect(savedContext.status).toBe(200);
    const globalIgnoreResponse = await fetch(`${base}/linguistic-ignores`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "es-BO", term: "AGETIC" }),
    });
    expect(globalIgnoreResponse.status).toBe(201);
    const globalIgnores = await fetch(
      `${base}/linguistic-ignores?language=es-BO`,
    );
    expect(await globalIgnores.json()).toEqual([
      expect.objectContaining({ term: "AGETIC" }),
    ]);
    const spellingResponse = await fetch(`${base}/spelling/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        blocks: [
          {
            text: "Puedes clickear para continuar",
            source: "text",
            selector: "p:nth-of-type(1)",
          },
        ],
      }),
    });
    expect(spellingResponse.status).toBe(200);
    expect((await spellingResponse.json()).findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "PREFERRED_TERM" }),
      ]),
    );
    const sessionResponse = await fetch(`${base}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        mode: "manual",
        browser: "Chromium",
        resolution: "1280x720",
        initialUrl: project.baseUrl,
      }),
    });
    const session = (await sessionResponse.json()) as { id: string };
    const pageResponse = await fetch(`${base}/sessions/${session.id}/pages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: `${project.baseUrl}/registro`,
        title: "Registro",
      }),
    });
    expect(pageResponse.status).toBe(201);
    const pagesResponse = await fetch(`${base}/sessions/${session.id}/pages`);
    expect(await pagesResponse.json()).toEqual([
      expect.objectContaining({ url: `${project.baseUrl}/registro` }),
    ]);
    const findingResponse = await fetch(`${base}/findings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        origin: "rule",
        ruleId: "FORM_INPUT_WITHOUT_LABEL",
        category: "form",
        title: "Campo sin label",
        description: "Falta label",
        severity: "major",
        priority: "high",
        confidence: 1,
        url: project.baseUrl,
      }),
    });
    const finding = (await findingResponse.json()) as {
      id: string;
      status: string;
    };
    expect(finding.status).toBe("candidate");
    const duplicateResponse = await fetch(`${base}/findings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        origin: "rule",
        ruleId: "FORM_INPUT_WITHOUT_LABEL",
        category: "form",
        title: "Campo sin label",
        description: "Falta label",
        severity: "major",
        priority: "high",
        confidence: 1,
        url: project.baseUrl,
      }),
    });
    expect(duplicateResponse.status).toBe(200);
    expect((await duplicateResponse.json()).duplicate).toBe(true);
    const updateResponse = await fetch(`${base}/findings/${finding.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "confirmed",
        actualResult: "No hay label",
      }),
    });
    expect((await updateResponse.json()).status).toBe("confirmed");
    const reportResponse = await fetch(`${base}/sessions/${session.id}/report`);
    expect(reportResponse.status).toBe(200);
    const report = (await reportResponse.json()) as {
      summary: { confirmed: number };
      confirmedCount: number;
      reports: { markdown: string };
    };
    expect(report.summary.confirmed).toBe(1);
    expect(report.confirmedCount).toBe(1);
    expect(report.reports.markdown).toContain("Campo sin label");
    await new Promise<void>((resolve, reject) =>
      app.close((error) => (error ? reject(error) : resolve())),
    );
  });
});
