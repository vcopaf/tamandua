import { summarizeSession } from "./domain.js";
import type { Finding, Project, Session } from "./schemas.js";

export type SessionReport = {
  project: Project;
  session: Session;
  findings: Finding[];
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\|`*_]/g, "\\$&");
}

export function renderJsonReport(report: SessionReport): string {
  return JSON.stringify(
    { ...report, summary: summarizeSession(report.findings) },
    null,
    2,
  );
}

export function renderMarkdownReport(report: SessionReport): string {
  const summary = summarizeSession(report.findings);
  const findings = report.findings
    .map((finding, index) =>
      [
        `## ${index + 1}. ${escapeMarkdown(finding.title)}`,
        `- Estado: ${finding.status}`,
        `- Categoría: ${finding.category}`,
        `- Severidad: ${finding.severity}`,
        `- Prioridad: ${finding.priority}`,
        `- URL: ${finding.url}`,
        "",
        escapeMarkdown(finding.description),
        finding.actualResult
          ? `\nResultado actual: ${escapeMarkdown(finding.actualResult)}`
          : "",
        finding.expectedResult
          ? `\nResultado esperado: ${escapeMarkdown(finding.expectedResult)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
  return `# Reporte de sesión ${escapeMarkdown(report.session.id)}\n\n- Proyecto: ${escapeMarkdown(report.project.name)}\n- Ambiente: ${escapeMarkdown(report.project.environment)}\n- Modo: ${report.session.mode}\n- Navegador: ${escapeMarkdown(report.session.browser)}\n- Resolución: ${escapeMarkdown(report.session.resolution)}\n- Inicio: ${report.session.startedAt}\n\n## Resumen\n\n- Total: ${summary.total}\n- Candidatos: ${summary.candidates}\n- Confirmados: ${summary.confirmed}\n- Descartados: ${summary.discarded}\n- Duplicados: ${summary.duplicates}\n- Resueltos: ${summary.resolved}\n\n${findings || "No hay hallazgos."}\n`;
}

export function renderHtmlReport(report: SessionReport): string {
  const summary = summarizeSession(report.findings);
  const rows = report.findings
    .map(
      (finding) =>
        `<article><h2>${escapeHtml(finding.title)}</h2><p><strong>${escapeHtml(finding.status)}</strong> · ${escapeHtml(finding.category)} · ${escapeHtml(finding.severity)} · ${escapeHtml(finding.priority)}</p><p>${escapeHtml(finding.description)}</p><p><a href="${escapeHtml(finding.url)}">${escapeHtml(finding.url)}</a></p>${finding.evidenceIds.length ? `<p>Evidencias: ${finding.evidenceIds.map(escapeHtml).join(", ")}</p>` : ""}</article>`,
    )
    .join("\n");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte ${escapeHtml(report.session.id)}</title><style>body{font:16px system-ui,sans-serif;max-width:960px;margin:40px auto;padding:0 20px;color:#222}article{border-top:1px solid #ddd;padding:20px 0}a{color:#075985}</style></head><body><h1>Reporte de sesión</h1><p><strong>${escapeHtml(report.project.name)}</strong> · ${escapeHtml(report.project.environment)} · ${escapeHtml(report.session.mode)}</p><p>Total: ${summary.total} · Confirmados: ${summary.confirmed} · Descartados: ${summary.discarded}</p>${rows || "<p>No hay hallazgos.</p>"}</body></html>`;
}
