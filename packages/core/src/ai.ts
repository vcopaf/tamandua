import { z } from "zod";
import type { PageSnapshot } from "./schemas.js";

export const aiFindingCandidateSchema = z.object({
  ruleId: z.string().min(1),
  category: z.enum([
    "form",
    "content",
    "accessibility",
    "technical",
    "functional",
    "other",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  actualResult: z.string().optional(),
  expectedResult: z.string().optional(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]),
  priority: z.enum(["high", "medium", "low"]),
  confidence: z.number().min(0).max(1),
  selector: z.string().optional(),
  evidenceText: z.string().optional(),
});
export type AIFindingCandidate = z.infer<typeof aiFindingCandidateSchema>;

const aiResponseSchema = z.object({
  findings: z.array(aiFindingCandidateSchema),
});

function redact(value: unknown): unknown {
  if (typeof value === "string")
    return value
      .replace(
        /(password|token|authorization|cookie|secret)\s*[:=]\s*[^\s,;]+/gi,
        "$1=[REDACTED]",
      )
      .slice(0, 2000);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /password|token|authorization|cookie|secret/i.test(key)
          ? "[REDACTED]"
          : redact(item),
      ]),
    );
  return value;
}

export function createAnalysisPrompt(snapshot: PageSnapshot): string {
  const safeSnapshot = redact(snapshot);
  return `Actúa como especialista QA de aplicaciones web. Analiza únicamente la información visible y comprobable del snapshot. Detecta posibles problemas de formularios, accesibilidad básica, contenido, textos, navegación y experiencia de usuario. Solo reporta un problema cuando exista evidencia explícita. No inventes estados, comportamientos o contenido. Ignora scripts, atributos internos, texto técnico de frameworks (Next.js, React, Angular, Vue), iconos aislados y contenido fuera del viewport. Si no hay evidencia suficiente, no generes un hallazgo. Devuelve únicamente JSON válido, sin Markdown ni explicaciones.\n\nFormato obligatorio:\n{"findings":[{"ruleId":"AI_DESCRIPTIVE_ID","category":"form|content|accessibility|technical|functional|other","title":"Título breve","description":"Descripción","actualResult":"Resultado actual","expectedResult":"Resultado esperado","severity":"blocker|critical|major|minor|trivial","priority":"high|medium|low","confidence":0.9,"selector":"#selector","evidenceText":"Texto relevante"}]}\n\nSnapshot:\n${JSON.stringify(safeSnapshot, null, 2)}`;
}

export function parseAIResponse(input: string): AIFindingCandidate[] {
  const cleaned = input
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return aiResponseSchema.parse(JSON.parse(cleaned)).findings;
}
