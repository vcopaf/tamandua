export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    browser.runtime.onMessage.addListener((message) => {
      if (message.type !== "TAMANDUA_ANALYZE_PAGE") return;
      return {
        url: window.location.href,
        title: document.title,
        headings: [...document.querySelectorAll("h1, h2, h3")]
          .map((element) => element.textContent?.trim())
          .filter(Boolean),
        texts: [...document.querySelectorAll("body *")]
          .filter((element) => element.children.length === 0)
          .map((element) => element.textContent?.trim())
          .filter(Boolean)
          .slice(0, 200),
        forms: document.forms.length,
        controls: document.querySelectorAll("input, select, textarea, button")
          .length,
      };
    });
  },
});
