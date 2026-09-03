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
  elementText: z.string().optional(),
  elementTag: z.string().optional(),
  location: z.string().optional(),
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
  return `Actúa como especialista QA de aplicaciones web. Analiza únicamente la información visible y comprobable del snapshot. Detecta posibles problemas de formularios, accesibilidad básica, contenido, textos, navegación y experiencia de usuario.

REGLAS OBLIGATORIAS:
- La respuesta debe ser exactamente un bloque de código \`json\` copiable. Dentro del bloque debe existir únicamente JSON puro, sin identificadores adicionales ni texto mezclado dentro del contenido.
- No escribas texto antes ni después del bloque de código. No incluyas comentarios ni explicaciones.
- Dentro del JSON solo pueden existir las propiedades definidas por el formato obligatorio. No mezcles texto conversacional dentro de ningún valor.
- La propiedad raíz obligatoria es findings y siempre debe ser un arreglo JSON. Si no hay hallazgos, responde exactamente {"findings":[]}.
- Si no existe evidencia explícita suficiente, devuelve exactamente {"findings":[]}.
- No inventes estados, comportamientos, textos, selectores ni funcionalidades.
- Ignora scripts, atributos internos, texto técnico de Next.js, React, Angular o Vue, iconos aislados y contenido fuera del viewport.
- Usa únicamente selectores que existan exactamente en el snapshot; si no aplica, omite selector y usa location "No determinable".
- elementTag debe corresponder al elemento real: input, button, a, img o document.
- evidenceText debe copiar literalmente evidencia visible del snapshot y escapar comillas correctamente.
- location debe indicar el contexto aproximado o ser "No determinable".
- Antes de responder, valida que el JSON pueda ser parseado por un parser estándar, que sus llaves estén balanceadas, que no haya comas finales, que las comillas internas estén escapadas y que todos los hallazgos tengan evidencia.

FORMATO OBLIGATORIO:
{"findings":[{"ruleId":"AI_DESCRIPTIVE_ID","category":"form|content|accessibility|technical|functional|other","title":"Título breve","description":"Descripción","actualResult":"Resultado actual","expectedResult":"Resultado esperado","severity":"blocker|critical|major|minor|trivial","priority":"high|medium|low","confidence":0.9,"selector":"#selector","elementText":"Texto visible o label","elementTag":"input|button|a|img|document","location":"Formulario de registro","evidenceText":"Texto literal que demuestra el problema"}]}

SNAPSHOT:
${JSON.stringify(safeSnapshot, null, 2)}`;
}

export function parseAIResponse(input: string): AIFindingCandidate[] {
  const fenced = input.match(/```json\s*([\s\S]*?)\s*```/i);
  const cleaned = (fenced?.[1] ?? input).trim();
  return aiResponseSchema.parse(JSON.parse(cleaned)).findings;
}
