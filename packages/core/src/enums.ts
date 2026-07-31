import { z } from "zod";

export const sessionModeSchema = z.enum(["manual", "automatic"]);
export type SessionMode = z.infer<typeof sessionModeSchema>;

export const sessionStatusSchema = z.enum(["active", "finished", "cancelled"]);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const findingStatusSchema = z.enum([
  "candidate",
  "confirmed",
  "discarded",
  "duplicate",
  "resolved",
]);
export type FindingStatus = z.infer<typeof findingStatusSchema>;

export const findingOriginSchema = z.enum([
  "manual",
  "automatic",
  "rule",
  "user",
]);
export type FindingOrigin = z.infer<typeof findingOriginSchema>;

export const findingCategorySchema = z.enum([
  "form",
  "content",
  "accessibility",
  "technical",
  "functional",
  "other",
]);
export type FindingCategory = z.infer<typeof findingCategorySchema>;

export const severitySchema = z.enum([
  "blocker",
  "critical",
  "major",
  "minor",
  "trivial",
]);
export type Severity = z.infer<typeof severitySchema>;

export const prioritySchema = z.enum(["high", "medium", "low"]);
export type Priority = z.infer<typeof prioritySchema>;

export const evidenceTypeSchema = z.enum([
  "element-screenshot",
  "full-page-screenshot",
  "html",
  "console-error",
  "network-error",
  "comment",
]);
export type EvidenceType = z.infer<typeof evidenceTypeSchema>;

export const executionStatusSchema = z.enum([
  "running",
  "passed",
  "failed",
  "cancelled",
]);
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;

export const ruleResultStatusSchema = z.enum(["candidate", "passed"]);
export type RuleResultStatus = z.infer<typeof ruleResultStatusSchema>;
