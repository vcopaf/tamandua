import { describe, expect, it } from "vitest";
import { LocalSpellingProvider } from "./spelling.js";

describe("local spelling provider", () => {
  it("detects spacing, capitalization and preferred terms", async () => {
    const issues = await new LocalSpellingProvider().check(
      [{ text: "  puedes  clickear", source: "heading", selector: "h1" }],
      {
        language: "es-BO",
        ignoredTerms: [],
        preferredTerms: { clickear: "hacer clic" },
      },
    );
    expect(issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        "TEXT_DOUBLE_WHITESPACE",
        "TEXT_LEADING_OR_TRAILING_WHITESPACE",
        "PREFERRED_TERM",
        "TEXT_CAPITALIZATION",
      ]),
    );
  });

  it("does not report ignored preferred terms", async () => {
    const issues = await new LocalSpellingProvider().check(
      [{ text: "AGETIC", source: "text" }],
      {
        language: "es-BO",
        ignoredTerms: ["AGETIC"],
        preferredTerms: { AGETIC: "Agencia" },
      },
    );
    expect(issues).toHaveLength(0);
  });
});
