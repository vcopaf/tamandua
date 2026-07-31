import { describe, expect, it } from "vitest";
import {
  DomainError,
  attachEvidence,
  cancelSession,
  closeSession,
  createFinding,
  createProject,
  startSession,
  summarizeSession,
  updateFinding,
  updateFindingStatus,
} from "./domain.js";

const now = new Date("2026-07-31T12:00:00.000Z");
const projectInput = {
  name: "Proyecto",
  baseUrl: "https://example.test",
  environment: "testing",
  language: "es-BO",
};

function makeSession() {
  const project = createProject(projectInput, now);
  return startSession(
    {
      projectId: project.id,
      mode: "manual",
      browser: "Chromium",
      resolution: "1440x900",
      initialUrl: project.baseUrl,
    },
    now,
  );
}

function makeFinding() {
  const session = makeSession();
  return createFinding(
    {
      sessionId: session.id,
      origin: "rule",
      ruleId: "FORM_INPUT_WITHOUT_LABEL",
      category: "form",
      title: "Campo sin etiqueta",
      description: "No existe una etiqueta asociada.",
      severity: "major",
      priority: "high",
      confidence: 1,
      url: session.initialUrl,
    },
    now,
  );
}

describe("project and session lifecycle", () => {
  it("creates a project and starts an active session", () => {
    const session = makeSession();

    expect(session.status).toBe("active");
    expect(session.findingsCount).toBe(0);
    expect(session.finishedAt).toBeNull();
  });

  it("closes an active session only once", () => {
    const session = makeSession();
    const closed = closeSession(session, now);

    expect(closed.status).toBe("finished");
    expect(closed.finishedAt).toBe(now.toISOString());
    expect(() => closeSession(closed, now)).toThrow(DomainError);
  });

  it("cancels an active session", () => {
    expect(cancelSession(makeSession(), now).status).toBe("cancelled");
  });
});

describe("finding lifecycle", () => {
  it("starts every finding as a candidate", () => {
    expect(makeFinding().status).toBe("candidate");
  });

  it("allows confirmation and resolution", () => {
    const candidate = makeFinding();
    const confirmed = updateFindingStatus(candidate, "confirmed");

    expect(updateFindingStatus(confirmed, "resolved").status).toBe("resolved");
  });

  it("rejects invalid transitions", () => {
    const discarded = updateFindingStatus(makeFinding(), "discarded");

    expect(() => updateFindingStatus(discarded, "confirmed")).toThrow(
      DomainError,
    );
  });

  it("edits active findings and attaches matching evidence", () => {
    const finding = makeFinding();
    const edited = updateFinding(finding, { title: "Título actualizado" });
    const attached = attachEvidence(edited, {
      id: "evidence-1",
      findingId: finding.id,
      type: "element-screenshot",
      originalPath: "screenshots/original.png",
      url: finding.url,
      capturedAt: now.toISOString(),
      browser: "Chromium",
      resolution: "1440x900",
    });

    expect(attached.title).toBe("Título actualizado");
    expect(attached.evidenceIds).toEqual(["evidence-1"]);
    expect(() =>
      attachEvidence(finding, {
        id: "evidence-2",
        findingId: "other",
        type: "element-screenshot",
        url: finding.url,
        capturedAt: now.toISOString(),
        browser: "Chromium",
        resolution: "1440x900",
      }),
    ).toThrow(DomainError);
  });
});

describe("session summary", () => {
  it("counts findings by status", () => {
    const candidate = makeFinding();
    const confirmed = updateFindingStatus(candidate, "confirmed");
    const discarded = updateFindingStatus(makeFinding(), "discarded");

    expect(summarizeSession([candidate, confirmed, discarded])).toEqual({
      total: 3,
      candidates: 1,
      confirmed: 1,
      discarded: 1,
      duplicates: 0,
      resolved: 0,
    });
  });
});
