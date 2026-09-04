import {
  evidenceSchema,
  findingSchema,
  globalLinguisticIgnoreSchema,
  projectContextSchema,
  projectSchema,
  sessionPageSchema,
  sessionSchema,
} from "@tamandua/core";
import type {
  Evidence,
  Finding,
  GlobalLinguisticIgnore,
  Project,
  ProjectContext,
  Session,
  SessionPage,
} from "@tamandua/core";
import { eq } from "drizzle-orm";
import type { DatabaseHandle } from "./database.js";
import {
  evidence,
  findings,
  globalLinguisticIgnores,
  projectContexts,
  projects,
  sessionPages,
  sessions,
} from "./schema.js";

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
    projectContexts: {
      async findByProjectId(projectId: string) {
        const rows = await db
          .select()
          .from(projectContexts)
          .where(eq(projectContexts.projectId, projectId));
        const row = rows[0];
        return row ? projectContextSchema.parse(row) : undefined;
      },
      async save(context: ProjectContext) {
        const value = projectContextSchema.parse(context);
        await db
          .insert(projectContexts)
          .values(value)
          .onConflictDoUpdate({
            target: projectContexts.projectId,
            set: {
              primaryLanguage: value.primaryLanguage,
              enabledLanguages: value.enabledLanguages,
              ignoredTerms: value.ignoredTerms,
              preferredTerms: value.preferredTerms,
              excludedSelectors: value.excludedSelectors,
              reviewerNotes: value.reviewerNotes,
            },
          });
        return value;
      },
    },
    globalLinguisticIgnores: {
      async listByLanguage(language: string) {
        return (
          await db
            .select()
            .from(globalLinguisticIgnores)
            .where(eq(globalLinguisticIgnores.language, language))
        ).map((row) =>
          globalLinguisticIgnoreSchema.parse({
            language: row.language,
            term: row.term,
            createdAt: row.createdAt,
          }),
        );
      },
      async save(ignore: GlobalLinguisticIgnore) {
        const value = globalLinguisticIgnoreSchema.parse(ignore);
        const key = `${value.language}:${value.term.toLocaleLowerCase(value.language)}`;
        await db
          .insert(globalLinguisticIgnores)
          .values({ ...value, key })
          .onConflictDoNothing();
        return value;
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
    sessionPages: {
      async listBySession(sessionId: string) {
        return (
          await db
            .select()
            .from(sessionPages)
            .where(eq(sessionPages.sessionId, sessionId))
        ).map((row) => sessionPageSchema.parse(row));
      },
      async record(page: SessionPage) {
        const value = sessionPageSchema.parse(page);
        const existing = (
          await db
            .select()
            .from(sessionPages)
            .where(eq(sessionPages.sessionId, value.sessionId))
        )
          .map((row) => sessionPageSchema.parse(row))
          .find((item) => item.url === value.url);
        if (existing) {
          const updated = sessionPageSchema.parse({
            ...existing,
            title: value.title,
            lastSeenAt: value.lastSeenAt,
            analysisCount: existing.analysisCount + 1,
          });
          await db
            .update(sessionPages)
            .set(updated)
            .where(eq(sessionPages.id, updated.id));
          return updated;
        }
        await db.insert(sessionPages).values(value);
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
      async update(finding: Finding) {
        const value = findingSchema.parse(finding);
        await db
          .update(findings)
          .set({
            ...value,
            ruleId: value.ruleId ?? null,
            actualResult: value.actualResult ?? null,
            expectedResult: value.expectedResult ?? null,
            element: value.element ?? null,
            evidenceIds: value.evidenceIds,
          })
          .where(eq(findings.id, value.id));
        return value;
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
