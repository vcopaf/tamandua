import type {
  SpellingConfig,
  SpellingIssue,
  SpellingProvider,
  TextBlock,
} from "@tamandua/core";
import { z } from "zod";

const responseSchema = z.object({
  matches: z.array(
    z.object({
      message: z.string(),
      offset: z.number().int().nonnegative(),
      length: z.number().int().positive(),
      replacements: z.array(z.object({ value: z.string() })).default([]),
      rule: z.object({ id: z.string() }).optional(),
    }),
  ),
});

export class LanguageToolProvider implements SpellingProvider {
  constructor(private readonly endpoint = "http://127.0.0.1:8081/v2/check") {}

  async check(
    blocks: TextBlock[],
    config: SpellingConfig,
  ): Promise<SpellingIssue[]> {
    const issues: SpellingIssue[] = [];
    for (const block of blocks) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            text: block.text,
            language: config.language.split("-")[0] ?? config.language,
            enabledOnly: "false",
          }),
        });
        if (!response.ok) continue;
        const parsed = responseSchema.parse(await response.json());
        issues.push(
          ...parsed.matches.map((match) => ({
            provider: "languagetool" as const,
            ruleId: match.rule?.id ?? "LANGUAGETOOL",
            message: match.message,
            text: block.text.slice(match.offset, match.offset + match.length),
            replacements: match.replacements
              .slice(0, 5)
              .map((replacement) => replacement.value),
            offset: match.offset,
            length: match.length,
            context: block.text,
            source: block.source,
            ...(block.selector ? { selector: block.selector } : {}),
          })),
        );
      } catch {
        // LanguageTool is optional; local rules remain available when it is down.
      }
    }
    return issues;
  }
}
