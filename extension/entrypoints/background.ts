import type { ExtensionMessage } from "../utils/messages.js";

export default defineBackground(() => {
  if ("sidePanel" in browser) {
    void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type !== "TAMANDUA_HEALTH") return;
    return fetch("http://127.0.0.1:4317/health")
      .then((response) => ({ connected: response.ok }))
      .catch(() => ({ connected: false }));
  });

  browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type !== "TAMANDUA_ELEMENT_SELECTED") return;
    void browser.runtime.sendMessage({
      type: "TAMANDUA_ELEMENT_SELECTED_FORWARD",
      element: message.element,
    });
  });
});
