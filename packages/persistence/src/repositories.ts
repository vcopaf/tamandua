import {
  evidenceSchema,
  findingSchema,
  projectSchema,
  sessionSchema,
} from "@tamandua/core";
import type { Evidence, Finding, Project, Session } from "@tamandua/core";
import { eq } from "drizzle-orm";
import type { DatabaseHandle } from "./database.js";
import { evidence, findings, projects, sessions } from "./schema.js";

export function createRepositories(handle: DatabaseHandle) {
  const { db } = handle;
  return {
    projects: {
      async list() {
        return (await db.select().from(projects)).map((row) =>
          projectSchema.parse({
            ...row,
            description: row.description ?? undefined,
          }),
        );
      },
      async save(project: Project) {
        const value = projectSchema.parse(project);
        await db
          .insert(projects)
          .values({ ...value, description: value.description ?? null });
        return value;
      },
      async findById(id: string) {
        const rows = await db
          .select()
          .from(projects)
          .where(eq(projects.id, id));
        const row = rows[0];
        return row
          ? projectSchema.parse({
              ...row,
              description: row.description ?? undefined,
            })
          : undefined;
      },
    },
    sessions: {
      async list() {
        return (await db.select().from(sessions)).map((row) =>
          sessionSchema.parse(row),
        );
      },
      async save(session: Session) {
        const value = sessionSchema.parse(session);
        await db
          .insert(sessions)
          .values({ ...value, finishedAt: value.finishedAt });
        return value;
      },
      async findById(id: string) {
        const rows = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, id));
        const row = rows[0];
        return row ? sessionSchema.parse(row) : undefined;
      },
      async update(session: Session) {
        const value = sessionSchema.parse(session);
        await db.update(sessions).set(value).where(eq(sessions.id, value.id));
        return value;
      },
    },
    findings: {
      async listBySession(sessionId: string) {
        return (
          await db
            .select()
            .from(findings)
            .where(eq(findings.sessionId, sessionId))
        ).map((row) =>
          findingSchema.parse({
            ...row,
            ruleId: row.ruleId ?? undefined,
            actualResult: row.actualResult ?? undefined,
            expectedResult: row.expectedResult ?? undefined,
            element: row.element ?? undefined,
          }),
        );
      },
      async save(finding: Finding) {
        const value = findingSchema.parse(finding);
        await db.insert(findings).values({
          ...value,
          ruleId: value.ruleId ?? null,
          actualResult: value.actualResult ?? null,
          expectedResult: value.expectedResult ?? null,
          element: value.element ?? null,
          evidenceIds: value.evidenceIds,
        });
        return value;
      },
      async findById(id: string) {
        const rows = await db
          .select()
          .from(findings)
          .where(eq(findings.id, id));
        const row = rows[0];
        return row
          ? findingSchema.parse({
              ...row,
              ruleId: row.ruleId ?? undefined,
              actualResult: row.actualResult ?? undefined,
              expectedResult: row.expectedResult ?? undefined,
              element: row.element ?? undefined,
            })
          : undefined;
      },
    },
    evidence: {
      async save(value: Evidence) {
        const validated = evidenceSchema.parse(value);
        await db.insert(evidence).values({
          ...validated,
          originalPath: validated.originalPath ?? null,
          annotatedPath: validated.annotatedPath ?? null,
          selector: validated.selector ?? null,
          comment: validated.comment ?? null,
        });
        return validated;
      },
    },
  };
}
