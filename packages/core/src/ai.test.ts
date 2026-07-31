import { describe, expect, it } from "vitest";
import { createAnalysisPrompt, parseAIResponse } from "./ai.js";
import type { PageSnapshot } from "./schemas.js";

const snapshot: PageSnapshot = {
  url: "https://example.test",
  title: "Demo",
  headings: [],
  texts: [],
  forms: [],
  controls: [],
  images: [],
};

describe("manual AI flow", () => {
  it("creates a prompt containing the snapshot and instructions", () => {
    expect(createAnalysisPrompt(snapshot)).toContain(
      "Devuelve únicamente JSON válido",
    );
    expect(createAnalysisPrompt(snapshot)).toContain("https://example.test");
  });

  it("parses JSON responses and rejects invalid responses", () => {
    const response = JSON.stringify({
      findings: [
        {
          ruleId: "AI_FORM",
          category: "form",
          title: "Problema",
          description: "Descripción",
          severity: "major",
          priority: "high",
          confidence: 0.8,
        },
      ],
    });
    expect(parseAIResponse(response)).toHaveLength(1);
    expect(() => parseAIResponse("No es JSON")).toThrow();
  });
});
