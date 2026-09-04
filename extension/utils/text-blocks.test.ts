import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { extractTextBlocks } from "./text-blocks.js";

const selectorFor = (element: Element) => element.tagName.toLowerCase();

describe("extractTextBlocks", () => {
  it("excludes icon fonts and hidden presentation text", () => {
    const window = new Window();
    window.document.body.innerHTML = `
      <p>Contenido visible para revisar.</p>
      <span class="material-icons notranslate" aria-hidden="true">file_copy_off</span>
      <span class="material-icons">copy</span>
      <span role="img">settings</span>
      <span>file_copy_off</span>
    `;

    const blocks = extractTextBlocks(
      window.document as unknown as Document,
      selectorFor,
      () => true,
    );

    expect(blocks).toEqual([
      {
        text: "Contenido visible para revisar.",
        selector: "p",
        source: "text",
      },
    ]);
  });

  it("keeps labels and button text", () => {
    const window = new Window();
    window.document.body.innerHTML = `
      <h2>Revisión ortográfica</h2>
      <button><span>Revisar página</span></button>
    `;

    const blocks = extractTextBlocks(
      window.document as unknown as Document,
      selectorFor,
      () => true,
    );

    expect(blocks).toEqual([
      { text: "Revisión ortográfica", selector: "h2", source: "heading" },
      { text: "Revisar página", selector: "span", source: "control" },
    ]);
  });
});
