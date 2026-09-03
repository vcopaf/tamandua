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
    const findingResponse = await fetch(`${base}/findings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: session.id,
        origin: "rule",
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
    const updateResponse = await fetch(`${base}/findings/${finding.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "confirmed",
        actualResult: "No hay label",
      }),
    });
    expect((await updateResponse.json()).status).toBe("confirmed");
    await new Promise<void>((resolve, reject) =>
      app.close((error) => (error ? reject(error) : resolve())),
    );
  });
});
