import { describe, expect, it, vi } from "vitest";
import { LanguageToolProvider } from "./languagetool.js";

describe("LanguageTool provider", () => {
  it("normalizes a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            matches: [
              {
                message: "Sugerencia",
                offset: 0,
                length: 4,
                replacements: [{ value: "Texto" }],
                rule: { id: "RULE" },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const issues = await new LanguageToolProvider().check(
      [{ text: "texto", source: "text" }],
      { language: "es-BO", ignoredTerms: [], preferredTerms: {} },
    );
    expect(issues[0]?.ruleId).toBe("RULE");
    vi.unstubAllGlobals();
  });

  it("fails open when the server is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      new LanguageToolProvider().check([{ text: "texto", source: "text" }], {
        language: "es-BO",
        ignoredTerms: [],
        preferredTerms: {},
      }),
    ).resolves.toEqual([]);
    vi.unstubAllGlobals();
  });

  it("omits terms ignored by the project or globally", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            matches: [
              {
                message: "Sugerencia",
                offset: 0,
                length: 6,
                replacements: [],
                rule: { id: "RULE" },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    await expect(
      new LanguageToolProvider().check([{ text: "AGETIC", source: "text" }], {
        language: "es-BO",
        ignoredTerms: ["AGETIC"],
        preferredTerms: {},
      }),
    ).resolves.toEqual([]);
    vi.unstubAllGlobals();
  });
});
