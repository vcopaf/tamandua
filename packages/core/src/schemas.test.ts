import { describe, expect, it } from "vitest";
import { createId } from "./identifiers.js";
import { findingSchema, projectSchema, sessionSchema } from "./schemas.js";

const date = "2026-07-31T12:00:00.000Z";

describe("domain schemas", () => {
  it("validates a project", () => {
    const result = projectSchema.safeParse({
      id: "project-1",
      name: "Ciudadanía Digital",
      baseUrl: "https://testing.example.test",
      environment: "testing",
      language: "es-BO",
      createdAt: date,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid project URLs and languages", () => {
    const result = projectSchema.safeParse({
      id: "project-1",
      name: "Proyecto",
      baseUrl: "not-a-url",
      environment: "testing",
      language: "Spanish",
      createdAt: date,
    });

    expect(result.success).toBe(false);
  });

  it("validates a session with a nullable finish date", () => {
    const result = sessionSchema.safeParse({
      id: "session-1",
      projectId: "project-1",
      mode: "manual",
      status: "active",
      browser: "Chromium",
      resolution: "1440x900",
      initialUrl: "https://testing.example.test",
      startedAt: date,
      finishedAt: null,
      findingsCount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("requires confidence to stay between zero and one", () => {
    const result = findingSchema.safeParse({
      id: "finding-1",
      sessionId: "session-1",
      origin: "rule",
      ruleId: "FORM_INPUT_WITHOUT_LABEL",
      category: "form",
      title: "Campo sin etiqueta",
      description: "El campo no tiene una etiqueta asociada.",
      severity: "major",
      priority: "high",
      confidence: 1.1,
      status: "candidate",
      url: "https://testing.example.test/form",
      evidenceIds: [],
      createdAt: date,
    });

    expect(result.success).toBe(false);
  });
});

describe("identifiers", () => {
  it("creates unique UUID identifiers", () => {
    const first = createId();
    const second = createId();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });
});
