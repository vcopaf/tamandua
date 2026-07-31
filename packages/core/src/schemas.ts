import { z } from "zod";
import {
  evidenceTypeSchema,
  executionStatusSchema,
  findingCategorySchema,
  findingOriginSchema,
  findingStatusSchema,
  prioritySchema,
  ruleResultStatusSchema,
  sessionModeSchema,
  sessionStatusSchema,
  severitySchema,
} from "./enums.js";

const id = z.string().min(1);
const dateTime = z.string().datetime({ offset: true });

export const projectSchema = z.object({
  id,
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  baseUrl: z.string().url(),
  environment: z.string().trim().min(1),
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  createdAt: dateTime,
});
export type Project = z.infer<typeof projectSchema>;

export const sessionSchema = z.object({
  id,
  projectId: id,
  mode: sessionModeSchema,
  status: sessionStatusSchema,
  browser: z.string().trim().min(1),
  resolution: z.string().trim().min(1),
  initialUrl: z.string().url(),
  startedAt: dateTime,
  finishedAt: dateTime.nullable(),
  findingsCount: z.number().int().nonnegative(),
});
export type Session = z.infer<typeof sessionSchema>;

export const elementSnapshotSchema = z.object({
  tagName: z.string().trim().min(1),
  visibleText: z.string(),
  selector: z.string().trim().min(1),
  accessibleRole: z.string().trim().optional(),
  associatedLabel: z.string().trim().optional(),
  placeholder: z.string().trim().optional(),
  type: z.string().trim().optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  visible: z.boolean().optional(),
  inViewport: z.boolean().optional(),
});
export type ElementSnapshot = z.infer<typeof elementSnapshotSchema>;

export const findingSchema = z.object({
  id,
  sessionId: id,
  origin: findingOriginSchema,
  ruleId: z.string().trim().min(1).optional(),
  category: findingCategorySchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  actualResult: z.string().trim().optional(),
  expectedResult: z.string().trim().optional(),
  severity: severitySchema,
  priority: prioritySchema,
  confidence: z.number().min(0).max(1),
  status: findingStatusSchema,
  url: z.string().url(),
  element: elementSnapshotSchema.optional(),
  evidenceIds: z.array(id),
  createdAt: dateTime,
});
export type Finding = z.infer<typeof findingSchema>;

export const evidenceSchema = z.object({
  id,
  findingId: id,
  type: evidenceTypeSchema,
  originalPath: z.string().trim().min(1).optional(),
  annotatedPath: z.string().trim().min(1).optional(),
  url: z.string().url(),
  capturedAt: dateTime,
  browser: z.string().trim().min(1),
  resolution: z.string().trim().min(1),
  selector: z.string().trim().optional(),
  comment: z.string().trim().optional(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const scenarioStepSchema = z.object({
  action: z.enum(["goto", "fill", "click", "wait"]),
  target: z.string().trim().optional(),
  value: z.string().optional(),
});
export type ScenarioStep = z.infer<typeof scenarioStepSchema>;

export const scenarioCheckSchema = z.object({
  type: z.enum([
    "text-visible",
    "url",
    "no-console-errors",
    "no-server-errors",
  ]),
  value: z.string().optional(),
});
export type ScenarioCheck = z.infer<typeof scenarioCheckSchema>;

export const scenarioSchema = z.object({
  id,
  projectId: id,
  name: z.string().trim().min(1),
  startUrl: z.string().trim().min(1),
  steps: z.array(scenarioStepSchema),
  checks: z.array(scenarioCheckSchema),
});
export type Scenario = z.infer<typeof scenarioSchema>;

export const executionSchema = z.object({
  id,
  sessionId: id,
  scenarioId: id,
  status: executionStatusSchema,
  startedAt: dateTime,
  finishedAt: dateTime.nullable(),
  error: z.string().trim().optional(),
  screenshotPath: z.string().trim().optional(),
  tracePath: z.string().trim().optional(),
});
export type Execution = z.infer<typeof executionSchema>;

export const executionStepSchema = z.object({
  id,
  executionId: id,
  position: z.number().int().nonnegative(),
  action: z.string().trim().min(1),
  status: z.enum(["passed", "failed", "skipped"]),
  error: z.string().trim().optional(),
  startedAt: dateTime,
  finishedAt: dateTime.nullable(),
});
export type ExecutionStep = z.infer<typeof executionStepSchema>;

export const ruleResultSchema = z.object({
  ruleId: z.string().trim().min(1),
  status: ruleResultStatusSchema,
  confidence: z.number().min(0).max(1),
  category: findingCategorySchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  url: z.string().url(),
  element: elementSnapshotSchema.optional(),
});
export type RuleResult = z.infer<typeof ruleResultSchema>;

export const imageSnapshotSchema = z.object({
  element: elementSnapshotSchema,
  alt: z.string(),
});
export type ImageSnapshot = z.infer<typeof imageSnapshotSchema>;

export const pageSnapshotSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  headings: z.array(z.string()),
  texts: z.array(z.string()),
  forms: z.array(z.unknown()),
  controls: z.array(elementSnapshotSchema),
  images: z.array(imageSnapshotSchema),
});
export type PageSnapshot = z.infer<typeof pageSnapshotSchema>;
