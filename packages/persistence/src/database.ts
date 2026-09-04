import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

export async function createDatabase(filename = ":memory:") {
  const client = createClient({
    url: filename === ":memory:" ? "file::memory:" : `file:${filename}`,
  });
  const db = drizzle(client);
  await db.run(sql`PRAGMA foreign_keys = ON`);
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, base_url TEXT NOT NULL, environment TEXT NOT NULL, language TEXT NOT NULL, created_at TEXT NOT NULL)`,
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS project_contexts (project_id TEXT PRIMARY KEY NOT NULL REFERENCES projects(id), primary_language TEXT NOT NULL, enabled_languages TEXT NOT NULL, ignored_terms TEXT NOT NULL, preferred_terms TEXT NOT NULL, excluded_selectors TEXT NOT NULL, reviewer_notes TEXT NOT NULL)`,
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS global_linguistic_ignores (key TEXT PRIMARY KEY NOT NULL, language TEXT NOT NULL, term TEXT NOT NULL, created_at TEXT NOT NULL)`,
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id), mode TEXT NOT NULL, status TEXT NOT NULL, browser TEXT NOT NULL, resolution TEXT NOT NULL, initial_url TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, findings_count INTEGER NOT NULL DEFAULT 0)`,
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS session_pages (id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(id), url TEXT NOT NULL, title TEXT NOT NULL, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, analysis_count INTEGER NOT NULL)`,
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS findings (id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(id), origin TEXT NOT NULL, rule_id TEXT, category TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, actual_result TEXT, expected_result TEXT, severity TEXT NOT NULL, priority TEXT NOT NULL, confidence INTEGER NOT NULL, status TEXT NOT NULL, url TEXT NOT NULL, element TEXT, evidence_ids TEXT NOT NULL, created_at TEXT NOT NULL)`,
  );
  await db.run(
    sql`CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY NOT NULL, finding_id TEXT NOT NULL REFERENCES findings(id), type TEXT NOT NULL, original_path TEXT, annotated_path TEXT, url TEXT NOT NULL, captured_at TEXT NOT NULL, browser TEXT NOT NULL, resolution TEXT NOT NULL, selector TEXT, comment TEXT)`,
  );
  return { db, client };
}

export type DatabaseHandle = Awaited<ReturnType<typeof createDatabase>>;
