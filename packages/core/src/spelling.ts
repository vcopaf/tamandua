import { z } from "zod";

export const spellingConfigSchema = z.object({
  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  ignoredTerms: z.array(z.string().min(1)).default([]),
  preferredTerms: z.record(z.string().min(1)).default({}),
});
export type SpellingConfig = z.infer<typeof spellingConfigSchema>;

export const textBlockSchema = z.object({
  text: z.string(),
  source: z.enum(["text", "heading", "control"]),
  selector: z.string().optional(),
});
export type TextBlock = z.infer<typeof textBlockSchema>;

export const spellingIssueSchema = z.object({
  provider: z.enum(["local", "languagetool"]),
  ruleId: z.string().min(1),
  message: z.string().min(1),
  text: z.string().min(1),
  replacements: z.array(z.string()).default([]),
  offset: z.number().int().nonnegative().optional(),
  length: z.number().int().positive().optional(),
  selector: z.string().optional(),
});
export type SpellingIssue = z.infer<typeof spellingIssueSchema>;

export interface SpellingProvider {
  check(blocks: TextBlock[], config: SpellingConfig): Promise<SpellingIssue[]>;
}

export class LocalSpellingProvider implements SpellingProvider {
  async check(
    blocks: TextBlock[],
    config: SpellingConfig,
  ): Promise<SpellingIssue[]> {
    const ignored = new Set(
      config.ignoredTerms.map((term) =>
        term.toLocaleLowerCase(config.language),
      ),
    );
    const issues: SpellingIssue[] = [];
    for (const block of blocks) {
      if (/\s{2,}/.test(block.text))
        issues.push({
          provider: "local",
          ruleId: "TEXT_DOUBLE_WHITESPACE",
          message: "El texto contiene espacios consecutivos.",
          text: block.text,
          replacements: [block.text.replace(/\s{2,}/g, " ")],
          ...(block.selector ? { selector: block.selector } : {}),
        });
      if (/^\s|\s$/.test(block.text))
        issues.push({
          provider: "local",
          ruleId: "TEXT_LEADING_OR_TRAILING_WHITESPACE",
          message: "El texto contiene espacios al inicio o al final.",
          text: block.text,
          replacements: [block.text.trim()],
          ...(block.selector ? { selector: block.selector } : {}),
        });
      for (const [term, preferred] of Object.entries(config.preferredTerms)) {
        if (ignored.has(term.toLocaleLowerCase(config.language))) continue;
        const match = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").exec(
          block.text,
        );
        if (match)
          issues.push({
            provider: "local",
            ruleId: "PREFERRED_TERM",
            message: `Usa "${preferred}" en lugar de "${term}".`,
            text: match[0],
            replacements: [preferred],
            offset: match.index,
            length: match[0].length,
            ...(block.selector ? { selector: block.selector } : {}),
          });
      }
      if (block.source === "heading" && /^[a-záéíóúñ]/.test(block.text.trim()))
        issues.push({
          provider: "local",
          ruleId: "TEXT_CAPITALIZATION",
          message: "El encabezado debería comenzar con mayúscula.",
          text: block.text,
          replacements: [capitalize(block.text.trim())],
          ...(block.selector ? { selector: block.selector } : {}),
        });
    }
    return deduplicateIssues(issues);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
export function deduplicateIssues(issues: SpellingIssue[]): SpellingIssue[] {
  return [
    ...new Map(
      issues.map((issue) => [
        `${issue.ruleId}:${issue.text}:${issue.selector ?? ""}`,
        issue,
      ]),
    ).values(),
  ];
}
