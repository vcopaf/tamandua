import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  baseUrl: text("base_url").notNull(),
  environment: text("environment").notNull(),
  language: text("language").notNull(),
  createdAt: text("created_at").notNull(),
});

export const projectContexts = sqliteTable("project_contexts", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id),
  primaryLanguage: text("primary_language").notNull(),
  enabledLanguages: text("enabled_languages", { mode: "json" }).notNull(),
  ignoredTerms: text("ignored_terms", { mode: "json" }).notNull(),
  preferredTerms: text("preferred_terms", { mode: "json" }).notNull(),
  excludedSelectors: text("excluded_selectors", { mode: "json" }).notNull(),
  reviewerNotes: text("reviewer_notes").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  browser: text("browser").notNull(),
  resolution: text("resolution").notNull(),
  initialUrl: text("initial_url").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  findingsCount: integer("findings_count").notNull().default(0),
});

export const findings = sqliteTable("findings", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  origin: text("origin").notNull(),
  ruleId: text("rule_id"),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actualResult: text("actual_result"),
  expectedResult: text("expected_result"),
  severity: text("severity").notNull(),
  priority: text("priority").notNull(),
  confidence: integer("confidence").notNull(),
  status: text("status").notNull(),
  url: text("url").notNull(),
  element: text("element", { mode: "json" }),
  evidenceIds: text("evidence_ids", { mode: "json" }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  findingId: text("finding_id")
    .notNull()
    .references(() => findings.id),
  type: text("type").notNull(),
  originalPath: text("original_path"),
  annotatedPath: text("annotated_path"),
  url: text("url").notNull(),
  capturedAt: text("captured_at").notNull(),
  browser: text("browser").notNull(),
  resolution: text("resolution").notNull(),
  selector: text("selector"),
  comment: text("comment"),
});
