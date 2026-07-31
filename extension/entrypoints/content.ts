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

function visibleTextBlocks(): string[] {
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
    .map(({ text }) => text)
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
    texts: visibleTextBlocks(),
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
      return undefined;
    });
  },
});
