import { describe, expect, it } from "vitest";
import {
  renderHtmlReport,
  renderJsonReport,
  renderMarkdownReport,
} from "./reports.js";
import type { SessionReport } from "./reports.js";

const report: SessionReport = {
  project: {
    id: "p1",
    name: "Demo <QA>",
    baseUrl: "https://example.test",
    environment: "testing",
    language: "es-BO",
    createdAt: "2026-07-31T12:00:00.000Z",
  },
  session: {
    id: "s1",
    projectId: "p1",
    mode: "manual",
    status: "finished",
    browser: "Chromium",
    resolution: "1280x720",
    initialUrl: "https://example.test",
    startedAt: "2026-07-31T12:00:00.000Z",
    finishedAt: "2026-07-31T12:05:00.000Z",
    findingsCount: 1,
  },
  findings: [
    {
      id: "f1",
      sessionId: "s1",
      origin: "rule",
      ruleId: "IMAGE_WITHOUT_ALT",
      category: "accessibility",
      title: "Imagen <sin alt>",
      description: "Descripción",
      severity: "major",
      priority: "high",
      confidence: 1,
      status: "confirmed",
      url: "https://example.test",
      evidenceIds: [],
      createdAt: "2026-07-31T12:01:00.000Z",
    },
  ],
};

describe("session reports", () => {
  it("renders structured JSON and readable Markdown", () => {
    expect(renderJsonReport(report)).toContain('"confirmed": 1');
    expect(renderMarkdownReport(report)).toContain("# Reporte de sesión s1");
  });

  it("escapes HTML content", () => {
    const html = renderHtmlReport(report);
    expect(html).toContain("Demo &lt;QA&gt;");
    expect(html).not.toContain("<sin alt>");
  });
});
