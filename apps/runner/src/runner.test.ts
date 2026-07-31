import type { Scenario } from "@tamandua/core";
import { describe, expect, it } from "vitest";
import { sanitizeMessage, technicalFindings } from "./runner.js";

const scenario: Scenario = {
  id: "scenario",
  projectId: "project",
  name: "Demo",
  startUrl: "/",
  steps: [],
  checks: [],
};

describe("technical execution evidence", () => {
  it("redacts sensitive values from console messages", () => {
    expect(sanitizeMessage("Authorization: Bearer secret-token")).toBe(
      "Authorization=[REDACTED]",
    );
    expect(sanitizeMessage("password=secret")).toBe("password=[REDACTED]");
  });

  it("creates technical candidates from captured events", () => {
    const findings = technicalFindings(
      scenario,
      [],
      [
        {
          url: "https://example.test/api",
          timestamp: new Date().toISOString(),
          status: 500,
          message: "HTTP 500",
        },
      ],
    );
    expect(findings[0]?.ruleId).toBe("TECH_HTTP_SERVER_ERROR");
    expect(findings[0]?.category).toBe("technical");
  });
});
