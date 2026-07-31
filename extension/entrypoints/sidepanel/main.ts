export {};

const status = document.querySelector<HTMLParagraphElement>("#status");
const result = document.querySelector<HTMLPreElement>("#result");
const analyze = document.querySelector<HTMLButtonElement>("#analyze");

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
  if (result) result.textContent = JSON.stringify(snapshot, null, 2);
});

await checkService();
