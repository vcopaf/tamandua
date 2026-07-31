CREATE TABLE `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `base_url` text NOT NULL,
  `environment` text NOT NULL,
  `language` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES projects(id),
  `mode` text NOT NULL,
  `status` text NOT NULL,
  `browser` text NOT NULL,
  `resolution` text NOT NULL,
  `initial_url` text NOT NULL,
  `started_at` text NOT NULL,
  `finished_at` text,
  `findings_count` integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `findings` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES sessions(id),
  `origin` text NOT NULL,
  `rule_id` text,
  `category` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `actual_result` text,
  `expected_result` text,
  `severity` text NOT NULL,
  `priority` text NOT NULL,
  `confidence` integer NOT NULL,
  `status` text NOT NULL,
  `url` text NOT NULL,
  `element` text,
  `evidence_ids` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evidence` (
  `id` text PRIMARY KEY NOT NULL,
  `finding_id` text NOT NULL REFERENCES findings(id),
  `type` text NOT NULL,
  `original_path` text,
  `annotated_path` text,
  `url` text NOT NULL,
  `captured_at` text NOT NULL,
  `browser` text NOT NULL,
  `resolution` text NOT NULL,
  `selector` text,
  `comment` text
);
