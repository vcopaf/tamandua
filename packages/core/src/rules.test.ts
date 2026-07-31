import { describe, expect, it } from "vitest";
import { analyzeSnapshot } from "./rules.js";
import type { PageSnapshot } from "./schemas.js";

const element = (
  overrides: Partial<PageSnapshot["controls"][number]> = {},
) => ({
  tagName: "input",
  visibleText: "",
  selector: "#field",
  width: 10,
  height: 10,
  x: 0,
  y: 0,
  ...overrides,
});
const snapshot: PageSnapshot = {
  url: "https://example.test/form",
  title: "Form",
  headings: [],
  texts: ["Texto  con espacios"],
  forms: [],
  controls: [
    element({ placeholder: "Correo", type: "text" }),
    element({ selector: "#save", tagName: "button" }),
  ],
  images: [
    { element: { ...element({ tagName: "img", selector: "img" }) }, alt: "" },
  ],
};

describe("rule engine", () => {
  it("creates candidates for form, content and accessibility issues", () => {
    const results = analyzeSnapshot(snapshot);
    expect(results.map((result) => result.ruleId)).toEqual(
      expect.arrayContaining([
        "FORM_INPUT_WITHOUT_LABEL",
        "FORM_EMAIL_WITH_WRONG_TYPE",
        "FORM_PLACEHOLDER_AS_LABEL",
        "BUTTON_WITHOUT_ACCESSIBLE_NAME",
        "IMAGE_WITHOUT_ALT",
        "TEXT_DOUBLE_WHITESPACE",
      ]),
    );
    expect(results.every((result) => result.status === "candidate")).toBe(true);
  });

  it("does not flag correctly labelled controls", () => {
    const results = analyzeSnapshot({
      ...snapshot,
      texts: [],
      controls: [
        element({
          associatedLabel: "Correo",
          type: "email",
          placeholder: undefined,
        }),
        element({ tagName: "button", visibleText: "Guardar" }),
      ],
      images: [{ element: { ...element({ tagName: "img" }) }, alt: "Logo" }],
    });
    expect(results).toHaveLength(0);
  });

  it("deduplicates identical rule and selector results", () => {
    const results = analyzeSnapshot({
      ...snapshot,
      controls: [
        element({ selector: "#same" }),
        element({ selector: "#same" }),
      ],
      texts: [],
      images: [],
    });
    expect(
      results.filter((result) => result.ruleId === "FORM_INPUT_WITHOUT_LABEL"),
    ).toHaveLength(1);
  });
});
