import { pageSnapshotSchema, ruleResultSchema } from "./schemas.js";
import type { ElementSnapshot, PageSnapshot, RuleResult } from "./schemas.js";

export type Rule = {
  id: string;
  evaluate(snapshot: PageSnapshot): RuleResult[];
};

function result(
  snapshot: PageSnapshot,
  ruleId: string,
  category: RuleResult["category"],
  title: string,
  description: string,
  element?: ElementSnapshot,
): RuleResult {
  return ruleResultSchema.parse({
    ruleId,
    status: "candidate",
    confidence: 1,
    category,
    title,
    description,
    url: snapshot.url,
    ...(element ? { element } : {}),
  });
}

const formControls = (snapshot: PageSnapshot) =>
  snapshot.controls.filter(
    (control) =>
      ["input", "select", "textarea"].includes(control.tagName) &&
      control.type !== "hidden",
  );

export const rules: Rule[] = [
  {
    id: "FORM_INPUT_WITHOUT_LABEL",
    evaluate: (snapshot) =>
      formControls(snapshot)
        .filter(
          (control) => !control.associatedLabel && !control.accessibleRole,
        )
        .map((control) =>
          result(
            snapshot,
            "FORM_INPUT_WITHOUT_LABEL",
            "form",
            "Campo sin etiqueta",
            "El control no tiene una etiqueta asociada ni un nombre accesible.",
            control,
          ),
        ),
  },
  {
    id: "FORM_REQUIRED_WITHOUT_INDICATOR",
    evaluate: (snapshot) =>
      formControls(snapshot)
        .filter(
          (control) =>
            control.required === true && !/[*!]/.test(control.visibleText),
        )
        .map((control) =>
          result(
            snapshot,
            "FORM_REQUIRED_WITHOUT_INDICATOR",
            "form",
            "Campo obligatorio sin indicador",
            "El campo es obligatorio pero no presenta un indicador visible.",
            control,
          ),
        ),
  },
  {
    id: "FORM_EMAIL_WITH_WRONG_TYPE",
    evaluate: (snapshot) =>
      formControls(snapshot)
        .filter(
          (control) =>
            (control.type === "text" || !control.type) &&
            /email|correo/i.test(
              `${control.associatedLabel ?? ""} ${control.placeholder ?? ""}`,
            ),
        )
        .map((control) =>
          result(
            snapshot,
            "FORM_EMAIL_WITH_WRONG_TYPE",
            "form",
            "Correo con tipo incorrecto",
            "El campo parece solicitar un correo pero no usa type=email.",
            control,
          ),
        ),
  },
  {
    id: "FORM_PLACEHOLDER_AS_LABEL",
    evaluate: (snapshot) =>
      formControls(snapshot)
        .filter(
          (control) => Boolean(control.placeholder) && !control.associatedLabel,
        )
        .map((control) =>
          result(
            snapshot,
            "FORM_PLACEHOLDER_AS_LABEL",
            "form",
            "Placeholder usado como etiqueta",
            "El placeholder parece ser la única identificación del campo.",
            control,
          ),
        ),
  },
  {
    id: "BUTTON_WITHOUT_ACCESSIBLE_NAME",
    evaluate: (snapshot) =>
      snapshot.controls
        .filter(
          (control) =>
            control.tagName === "button" &&
            !control.visibleText &&
            !control.accessibleRole,
        )
        .map((control) =>
          result(
            snapshot,
            "BUTTON_WITHOUT_ACCESSIBLE_NAME",
            "accessibility",
            "Botón sin nombre accesible",
            "El botón no tiene texto visible ni nombre accesible.",
            control,
          ),
        ),
  },
  {
    id: "IMAGE_WITHOUT_ALT",
    evaluate: (snapshot) =>
      snapshot.images
        .filter((image) => !image.alt.trim())
        .map((image) =>
          result(
            snapshot,
            "IMAGE_WITHOUT_ALT",
            "accessibility",
            "Imagen sin texto alternativo",
            "La imagen no tiene texto alternativo.",
            image.element,
          ),
        ),
  },
  {
    id: "TEXT_DOUBLE_WHITESPACE",
    evaluate: (snapshot) =>
      snapshot.texts
        .filter((text) => /\s{2,}/.test(text))
        .map((text) =>
          result(
            snapshot,
            "TEXT_DOUBLE_WHITESPACE",
            "content",
            "Espacios dobles en texto",
            `El texto contiene espacios consecutivos: "${text}"`,
          ),
        ),
  },
  {
    id: "TEXT_EMPTY_INTERACTIVE_ELEMENT",
    evaluate: (snapshot) =>
      snapshot.controls
        .filter(
          (control) =>
            ["button", "a"].includes(control.tagName) &&
            !control.visibleText &&
            !control.accessibleRole,
        )
        .map((control) =>
          result(
            snapshot,
            "TEXT_EMPTY_INTERACTIVE_ELEMENT",
            "content",
            "Elemento interactivo sin texto",
            "El elemento interactivo no tiene texto identificable.",
            control,
          ),
        ),
  },
];

export function analyzeSnapshot(
  input: PageSnapshot,
  selectedRules = rules,
): RuleResult[] {
  const snapshot = pageSnapshotSchema.parse(input);
  const seen = new Set<string>();
  return selectedRules
    .flatMap((rule) => rule.evaluate(snapshot))
    .filter((finding) => {
      const key = `${finding.ruleId}:${finding.element?.selector ?? finding.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
