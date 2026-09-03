import type { ExtensionMessage } from "../utils/messages.js";

type ElementSnapshot = {
  tagName: string;
  visibleText: string;
  selector: string;
  accessibleRole?: string | undefined;
  associatedLabel?: string | undefined;
  placeholder?: string | undefined;
  type?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  width: number;
  height: number;
  x: number;
  y: number;
  visible: boolean;
  inViewport: boolean;
};

function selectorFor(element: Element): string {
  const htmlElement = element as HTMLElement;
  if (htmlElement.id) return `#${CSS.escape(htmlElement.id)}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter(
        (child) => child.tagName === current?.tagName,
      );
      if (siblings.length > 1)
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(" > ");
}

function associatedLabel(element: HTMLElement): string | undefined {
  if (element instanceof HTMLInputElement && element.labels?.[0])
    return element.labels[0].textContent?.trim() || undefined;
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy)
    return (
      labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean)
        .join(" ") || undefined
    );
  return undefined;
}

function snapshotElement(element: Element): ElementSnapshot {
  const htmlElement = element as HTMLElement;
  const rect = htmlElement.getBoundingClientRect();
  const role =
    htmlElement.getAttribute("role") ||
    (element instanceof HTMLButtonElement ? "button" : undefined);
  const style = window.getComputedStyle(htmlElement);
  const visible =
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    rect.width > 0 &&
    rect.height > 0;
  const inViewport =
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth;
  return {
    tagName: element.tagName.toLowerCase(),
    visibleText: (
      htmlElement.innerText ||
      htmlElement.textContent ||
      ""
    ).trim(),
    selector: selectorFor(element),
    ...(role ? { accessibleRole: role } : {}),
    ...(associatedLabel(htmlElement)
      ? { associatedLabel: associatedLabel(htmlElement) }
      : {}),
    ...(htmlElement.getAttribute("placeholder")
      ? { placeholder: htmlElement.getAttribute("placeholder") ?? undefined }
      : {}),
    ...(htmlElement.getAttribute("type")
      ? { type: htmlElement.getAttribute("type") ?? undefined }
      : {}),
    ...("required" in htmlElement
      ? { required: Boolean((htmlElement as HTMLInputElement).required) }
      : {}),
    ...("disabled" in htmlElement
      ? { disabled: Boolean((htmlElement as HTMLInputElement).disabled) }
      : {}),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    visible,
    inViewport,
  };
}

function isFrameworkNoise(text: string): boolean {
  return /self\.__next_f|webpackJsonp|__react|react\.development|ng-version|vue-devtools|light_mode|expand_more/i.test(
    text,
  );
}

type TextBlock = {
  text: string;
  source: "text" | "heading" | "control";
  selector: string;
};

function visibleTextBlocks(): TextBlock[] {
  return [...document.querySelectorAll("body *")]
    .filter((element) => element.children.length === 0)
    .map((element) => ({ element, text: element.textContent?.trim() ?? "" }))
    .filter(({ element, text }) => {
      const snapshot = snapshotElement(element);
      return (
        Boolean(text) &&
        !isFrameworkNoise(text) &&
        snapshot.visible &&
        snapshot.inViewport
      );
    })
    .map(({ element, text }) => ({
      text,
      selector: selectorFor(element),
      source: element.matches("h1, h2, h3")
        ? ("heading" as const)
        : element.matches("button, input, select, textarea")
          ? ("control" as const)
          : ("text" as const),
    }))
    .slice(0, 200);
}

function pageSnapshot() {
  return {
    url: window.location.href,
    title: document.title,
    headings: [...document.querySelectorAll("h1, h2, h3")]
      .map((element) => ({ element, text: element.textContent?.trim() ?? "" }))
      .filter(({ element, text }) => {
        const snapshot = snapshotElement(element);
        return (
          Boolean(text) &&
          !isFrameworkNoise(text) &&
          snapshot.visible &&
          snapshot.inViewport
        );
      })
      .map(({ text }) => text),
    texts: visibleTextBlocks().map((block) => block.text),
    forms: [...document.forms].map((form) => ({
      selector: selectorFor(form),
      controls: form.querySelectorAll("input, select, textarea, button").length,
    })),
    controls: [...document.querySelectorAll("input, select, textarea, button")]
      .map(snapshotElement)
      .filter((element) => element.visible),
    images: [...document.images]
      .map((image) => ({
        element: snapshotElement(image),
        alt: image.alt,
      }))
      .filter((image) => image.element.visible),
  };
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let selecting = false;
    let hovered: HTMLElement | undefined;
    let previousOutline = "";
    let activeTextMark: HTMLElement | undefined;
    const clearTextMark = () => {
      if (!activeTextMark) return;
      activeTextMark.replaceWith(
        document.createTextNode(activeTextMark.textContent ?? ""),
      );
      activeTextMark = undefined;
    };
    const highlight = (element: HTMLElement | undefined) => {
      if (hovered) hovered.style.outline = previousOutline;
      hovered = element;
      if (element) {
        previousOutline = element.style.outline;
        element.style.outline = "3px solid #d97706";
      }
    };
    const onMove = (event: MouseEvent) =>
      highlight(event.target instanceof HTMLElement ? event.target : undefined);
    const onClick = (event: MouseEvent) => {
      if (!selecting || !(event.target instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      selecting = false;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      const selected = snapshotElement(event.target);
      highlight(undefined);
      void browser.runtime.sendMessage({
        type: "TAMANDUA_ELEMENT_SELECTED",
        element: selected,
      });
    };
    browser.runtime.onMessage.addListener(async (message: ExtensionMessage) => {
      if (message.type === "TAMANDUA_ANALYZE_PAGE") {
        try {
          return pageSnapshot();
        } catch {
          return {
            url: window.location.href,
            title: document.title,
            headings: [],
            texts: [],
            forms: [],
            controls: [],
            images: [],
          };
        }
      }
      if (message.type === "TAMANDUA_GET_TEXT_BLOCKS")
        return visibleTextBlocks();
      if (message.type === "TAMANDUA_START_SELECTOR") {
        selecting = true;
        document.addEventListener("mousemove", onMove, true);
        document.addEventListener("click", onClick, true);
        return { active: true };
      }
      if (message.type === "TAMANDUA_STOP_SELECTOR") {
        selecting = false;
        document.removeEventListener("mousemove", onMove, true);
        document.removeEventListener("click", onClick, true);
        highlight(undefined);
        return { active: false };
      }
      if (message.type === "TAMANDUA_HIGHLIGHT_ELEMENT") {
        const element = document.querySelector<HTMLElement>(message.selector);
        if (!element) return { found: false };
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        const previous = element.style.outline;
        element.style.outline = "3px solid #d97706";
        window.setTimeout(() => {
          element.style.outline = previous;
        }, 2500);
        return { found: true };
      }
      if (message.type === "TAMANDUA_HIGHLIGHT_TEXT") {
        clearTextMark();
        const element = document.querySelector<HTMLElement>(message.selector);
        if (!element) return { found: false };
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const node = walker.nextNode();
        if (!node || !node.textContent) return { found: false };
        const offset = message.offset ?? 0;
        const length = message.length ?? node.textContent.length;
        if (offset + length > node.textContent.length) return { found: false };
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + length);
        const mark = document.createElement("mark");
        mark.style.background = "#fef08a";
        mark.style.outline = "2px solid #dc2626";
        mark.style.outlineOffset = "2px";
        range.surroundContents(mark);
        activeTextMark = mark;
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(clearTextMark, 5000);
        return { found: true };
      }
      return undefined;
    });
  },
});
