import type { ExtensionMessage } from "../../utils/messages.js";

const status = document.querySelector<HTMLParagraphElement>("#status");
const result = document.querySelector<HTMLPreElement>("#result");
const analyze = document.querySelector<HTMLButtonElement>("#analyze");
const select = document.querySelector<HTMLButtonElement>("#select");
const capture = document.querySelector<HTMLButtonElement>("#capture");
let selectedElement: { selector?: string } | undefined;

async function checkService() {
  const response = await browser.runtime.sendMessage({
    type: "TAMANDUA_HEALTH",
  });
  status?.replaceChildren(
    document.createTextNode(
      response.connected ? "Servicio conectado" : "Servicio desconectado",
    ),
  );
}

analyze?.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const snapshot = await browser.tabs.sendMessage(tab.id, {
    type: "TAMANDUA_ANALYZE_PAGE",
  });
  await fetch("http://127.0.0.1:4317/snapshots", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snapshot),
  }).catch(() => undefined);
  const analysis = await fetch("http://127.0.0.1:4317/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(snapshot),
  })
    .then((response) => response.json() as Promise<unknown>)
    .catch(() => ({ findings: [] }));
  if (result)
    result.textContent = JSON.stringify({ snapshot, analysis }, null, 2);
});

select?.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await browser.tabs.sendMessage(tab.id, { type: "TAMANDUA_START_SELECTOR" });
  if (status) status.textContent = "Selecciona un elemento en la página";
});

browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type !== "TAMANDUA_ELEMENT_SELECTED_FORWARD") return;
  if (result) result.textContent = JSON.stringify(message.element, null, 2);
  selectedElement = message.element as { selector?: string };
  if (status) status.textContent = "Elemento seleccionado";
});

capture?.addEventListener("click", async () => {
  const findingId = window.prompt("ID del hallazgo confirmado");
  if (!findingId) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.windowId || !tab.url) return;
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
  });
  const response = await fetch("http://127.0.0.1:4317/evidence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      findingId,
      type: selectedElement ? "element-screenshot" : "full-page-screenshot",
      dataUrl,
      url: tab.url,
      browser: "Chromium",
      resolution: `${window.screen.width}x${window.screen.height}`,
      ...(selectedElement?.selector
        ? { selector: selectedElement.selector }
        : {}),
    }),
  });
  if (status)
    status.textContent = response.ok
      ? "Evidencia guardada"
      : "No se pudo guardar la evidencia";
});

await checkService();
