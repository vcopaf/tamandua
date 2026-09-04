import type { TextBlock } from "@tamandua/core";

const nonLinguisticTags = "svg, script, style, noscript, template, code, pre";

function hasIconClass(element: Element): boolean {
  return [...element.classList].some(
    (className) =>
      className === "notranslate" ||
      className === "material-icons" ||
      className.startsWith("material-icons-") ||
      className.startsWith("material-symbols"),
  );
}

export function isLinguisticText(element: Element, text: string): boolean {
  if (!text || element.matches(nonLinguisticTags)) return false;
  if (
    /self\.__next_f|webpackJsonp|__react|react\.development|ng-version|vue-devtools|light_mode|expand_more/i.test(
      text,
    )
  )
    return false;
  if (/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/i.test(text)) return false;
  for (
    let current: Element | null = element;
    current;
    current = current.parentElement
  ) {
    if (
      current.getAttribute("aria-hidden") === "true" ||
      current.getAttribute("role") === "presentation" ||
      current.getAttribute("role") === "img" ||
      current.matches(nonLinguisticTags) ||
      hasIconClass(current)
    )
      return false;
  }
  return true;
}

export function extractTextBlocks(
  root: ParentNode,
  selectorFor: (element: Element) => string,
  isVisible: (element: Element) => boolean,
): TextBlock[] {
  return [...root.querySelectorAll("body *")]
    .filter((element) => element.children.length === 0)
    .map((element) => ({ element, text: element.textContent?.trim() ?? "" }))
    .filter(
      ({ element, text }) =>
        isLinguisticText(element, text) && isVisible(element),
    )
    .map(({ element, text }) => ({
      text,
      selector: selectorFor(element),
      source: element.closest("h1, h2, h3")
        ? ("heading" as const)
        : element.closest("button, input, select, textarea")
          ? ("control" as const)
          : ("text" as const),
    }))
    .slice(0, 200);
}
