import type { FindingStatus } from "./enums.js";
import { createId } from "./identifiers.js";
import {
  evidenceSchema,
  findingSchema,
  projectSchema,
  sessionSchema,
} from "./schemas.js";
import type { Evidence, Finding, Project, Session } from "./schemas.js";

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export type CreateProjectInput = Omit<Project, "id" | "createdAt">;

export function createProject(
  input: CreateProjectInput,
  now = new Date(),
): Project {
  return projectSchema.parse({
    ...input,
    id: createId(),
    createdAt: now.toISOString(),
  });
}

export type StartSessionInput = Omit<
  Session,
  "id" | "status" | "finishedAt" | "findingsCount" | "startedAt"
>;

export function startSession(
  input: StartSessionInput,
  now = new Date(),
): Session {
  return sessionSchema.parse({
    ...input,
    id: createId(),
    status: "active",
    finishedAt: null,
    findingsCount: 0,
    startedAt: now.toISOString(),
  });
}

export function closeSession(session: Session, now = new Date()): Session {
  if (session.status !== "active") {
    throw new DomainError("Only active sessions can be closed");
  }

  return sessionSchema.parse({
    ...session,
    status: "finished",
    finishedAt: now.toISOString(),
  });
}

export function cancelSession(session: Session, now = new Date()): Session {
  if (session.status !== "active") {
    throw new DomainError("Only active sessions can be cancelled");
  }

  return sessionSchema.parse({
    ...session,
    status: "cancelled",
    finishedAt: now.toISOString(),
  });
}

export type CreateFindingInput = Omit<
  Finding,
  "id" | "status" | "evidenceIds" | "createdAt"
>;

export function createFinding(
  input: CreateFindingInput,
  now = new Date(),
): Finding {
  return findingSchema.parse({
    ...input,
    id: createId(),
    status: "candidate",
    evidenceIds: [],
    createdAt: now.toISOString(),
  });
}

const allowedTransitions: Record<FindingStatus, FindingStatus[]> = {
  candidate: ["confirmed", "discarded", "duplicate"],
  confirmed: ["resolved", "duplicate"],
  discarded: [],
  duplicate: [],
  resolved: [],
};

export function updateFindingStatus(
  finding: Finding,
  status: FindingStatus,
): Finding {
  if (!allowedTransitions[finding.status].includes(status)) {
    throw new DomainError(
      `Invalid finding transition: ${finding.status} -> ${status}`,
    );
  }

  return findingSchema.parse({ ...finding, status });
}

export type FindingUpdate = Partial<
  Pick<
    Finding,
    | "title"
    | "description"
    | "actualResult"
    | "expectedResult"
    | "severity"
    | "priority"
  >
>;

export function updateFinding(
  finding: Finding,
  update: FindingUpdate,
): Finding {
  if (finding.status === "discarded" || finding.status === "duplicate") {
    throw new DomainError("Discarded or duplicate findings cannot be edited");
  }

  return findingSchema.parse({ ...finding, ...update });
}

export function attachEvidence(finding: Finding, evidence: Evidence): Finding {
  const validatedEvidence = evidenceSchema.parse(evidence);
  if (validatedEvidence.findingId !== finding.id) {
    throw new DomainError("Evidence belongs to a different finding");
  }
  if (finding.evidenceIds.includes(validatedEvidence.id)) {
    return finding;
  }

  return findingSchema.parse({
    ...finding,
    evidenceIds: [...finding.evidenceIds, validatedEvidence.id],
  });
}

export type SessionSummary = {
  total: number;
  candidates: number;
  confirmed: number;
  discarded: number;
  duplicates: number;
  resolved: number;
};

export function summarizeSession(findings: Finding[]): SessionSummary {
  return findings.reduce<SessionSummary>(
    (summary, finding) => {
      summary.total += 1;
      if (finding.status === "candidate") summary.candidates += 1;
      if (finding.status === "confirmed") summary.confirmed += 1;
      if (finding.status === "discarded") summary.discarded += 1;
      if (finding.status === "duplicate") summary.duplicates += 1;
      if (finding.status === "resolved") summary.resolved += 1;
      return summary;
    },
    {
      total: 0,
      candidates: 0,
      confirmed: 0,
      discarded: 0,
      duplicates: 0,
      resolved: 0,
    },
  );
}
