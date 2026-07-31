export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "TAMANDUA_HEALTH") return;
    return fetch("http://127.0.0.1:4317/health")
      .then((response) => ({ connected: response.ok }))
      .catch(() => ({ connected: false }));
  });
});
