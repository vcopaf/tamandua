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

  browser.runtime.onMessage.addListener(
    async (message: ExtensionMessage, sender) => {
      if (message.type !== "TAMANDUA_PAGE_STABLE" || !sender.tab?.id) return;
      const { activeSession, continuousReview } =
        await browser.storage.local.get(["activeSession", "continuousReview"]);
      const session = activeSession as
        | { id: string; projectId: string }
        | undefined;
      const review = continuousReview as
        | { active: boolean; pagesReviewed: number; candidatesFound: number }
        | undefined;
      if (!session || !review?.active) return;
      try {
        const blocks = await browser.tabs.sendMessage(sender.tab.id, {
          type: "TAMANDUA_GET_TEXT_BLOCKS",
        });
        if (!Array.isArray(blocks) || !blocks.length) return;
        const analysis = await fetch("http://127.0.0.1:4317/spelling/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId: session.projectId, blocks }),
        }).then((response) =>
          response.ok ? response.json() : { findings: [] },
        );
        const findings = Array.isArray(analysis.findings)
          ? analysis.findings
          : [];
        let added = 0;
        for (const issue of findings) {
          const response = await fetch("http://127.0.0.1:4317/findings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              sessionId: session.id,
              origin: "automatic",
              ruleId: issue.ruleId,
              category: "content",
              title: `Redacción: ${issue.text}`,
              description: issue.message,
              actualResult: issue.context ?? issue.text,
              expectedResult:
                issue.replacements?.[0] ?? "Revisar la redacción indicada.",
              severity: "minor",
              priority: "low",
              confidence: issue.provider === "languagetool" ? 0.8 : 0.9,
              url: message.url,
              ...(issue.selector
                ? {
                    selector: issue.selector,
                    elementText: issue.context ?? issue.text,
                    elementTag: issue.source ?? "text",
                  }
                : {}),
            }),
          });
          if (response.status === 201) added += 1;
        }
        await fetch(
          `http://127.0.0.1:4317/sessions/${encodeURIComponent(session.id)}/pages`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: message.url, title: message.title }),
          },
        );
        await browser.storage.local.set({
          continuousReview: {
            active: true,
            pagesReviewed: review.pagesReviewed + 1,
            candidatesFound: review.candidatesFound + added,
          },
        });
        void browser.runtime.sendMessage({
          type: "TAMANDUA_CONTINUOUS_REVIEW_UPDATED",
          url: message.url,
          detected: findings.length,
          added,
        });
      } catch {
        // Continuous review is best-effort; navigation must never be blocked.
      }
    },
  );
});
