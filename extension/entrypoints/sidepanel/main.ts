import { createAnalysisPrompt, parseAIResponse } from "@tamandua/core/ai";
import type { ElementSnapshot, PageSnapshot } from "@tamandua/core/schemas";
import type { ExtensionMessage } from "../../utils/messages.js";

const status = document.querySelector<HTMLParagraphElement>("#status");
const result = document.querySelector<HTMLPreElement>("#result");
const analyze = document.querySelector<HTMLButtonElement>("#analyze");
const select = document.querySelector<HTMLButtonElement>("#select");
const reloadTab = document.querySelector<HTMLButtonElement>("#reload-tab");
const capture = document.querySelector<HTMLButtonElement>("#capture");
const filter = document.querySelector<HTMLSelectElement>("#finding-filter");
const originFilter = document.querySelector<HTMLSelectElement>(
  "#finding-origin-filter",
);
const categoryFilter = document.querySelector<HTMLSelectElement>(
  "#finding-category-filter",
);
const severityFilter = document.querySelector<HTMLSelectElement>(
  "#finding-severity-filter",
);
const findingsView = document.querySelector<HTMLDivElement>("#findings");
const refreshFindings =
  document.querySelector<HTMLButtonElement>("#refresh-findings");
const saveCandidates =
  document.querySelector<HTMLButtonElement>("#save-candidates");
const projectSelect = document.querySelector<HTMLSelectElement>("#project");
const startSessionButton =
  document.querySelector<HTMLButtonElement>("#start-session");
const closeSessionButton =
  document.querySelector<HTMLButtonElement>("#close-session");
const sessionView = document.querySelector<HTMLParagraphElement>("#session-id");
const sessionSummary =
  document.querySelector<HTMLDivElement>("#session-summary");
const reviewedPages = document.querySelector<HTMLDivElement>("#reviewed-pages");
const historyView = document.querySelector<HTMLDivElement>("#history");
const loadHistoryButton =
  document.querySelector<HTMLButtonElement>("#load-history");
const navigation = [
  ...document.querySelectorAll<HTMLButtonElement>("nav [data-view]"),
];
const newProjectButton =
  document.querySelector<HTMLButtonElement>("#new-project");
const projectForm = document.querySelector<HTMLDivElement>("#project-form");
const projectName = document.querySelector<HTMLInputElement>("#project-name");
const projectUrl = document.querySelector<HTMLInputElement>("#project-url");
const createProjectButton =
  document.querySelector<HTMLButtonElement>("#create-project");
const projectNameError = document.querySelector<HTMLParagraphElement>(
  "#project-name-error",
);
const projectUrlError =
  document.querySelector<HTMLParagraphElement>("#project-url-error");
const copyPromptButton =
  document.querySelector<HTMLButtonElement>("#copy-prompt");
const aiResponse = document.querySelector<HTMLTextAreaElement>("#ai-response");
const importAIButton = document.querySelector<HTMLButtonElement>("#import-ai");
const aiError = document.querySelector<HTMLParagraphElement>("#ai-error");
const contextLanguage =
  document.querySelector<HTMLSelectElement>("#context-language");
const ignoredTerms =
  document.querySelector<HTMLTextAreaElement>("#ignored-terms");
const preferredTerms =
  document.querySelector<HTMLTextAreaElement>("#preferred-terms");
const reviewerNotes =
  document.querySelector<HTMLTextAreaElement>("#reviewer-notes");
const saveContextButton =
  document.querySelector<HTMLButtonElement>("#save-context");
const checkSpellingButton =
  document.querySelector<HTMLButtonElement>("#check-spelling");
const spellingSummary =
  document.querySelector<HTMLParagraphElement>("#spelling-summary");
const spellingFindings =
  document.querySelector<HTMLDivElement>("#spelling-findings");
const manualSelection =
  document.querySelector<HTMLParagraphElement>("#manual-selection");
const manualTitle = document.querySelector<HTMLInputElement>("#manual-title");
const manualDescription = document.querySelector<HTMLTextAreaElement>(
  "#manual-description",
);
const manualCategory =
  document.querySelector<HTMLSelectElement>("#manual-category");
const manualSeverity =
  document.querySelector<HTMLSelectElement>("#manual-severity");
const manualPriority =
  document.querySelector<HTMLSelectElement>("#manual-priority");
const createManualFinding = document.querySelector<HTMLButtonElement>(
  "#create-manual-finding",
);
type ProjectContext = {
  primaryLanguage: string;
  enabledLanguages: string[];
  ignoredTerms: string[];
  preferredTerms: Record<string, string>;
  excludedSelectors: string[];
  reviewerNotes: string;
};
type SpellingIssue = {
  provider: "local" | "languagetool";
  ruleId: string;
  message: string;
  text: string;
  replacements: string[];
  offset?: number;
  length?: number;
  selector?: string;
  context?: string;
  source?: "text" | "heading" | "control";
};
let selectedElement: { selector?: string } | undefined;
let lastCandidates: Array<Record<string, unknown>> = [];
let selectedFindingId: string | undefined;
let lastSnapshot: PageSnapshot | undefined;
let currentProjectContext: ProjectContext | undefined;

for (const button of navigation) {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (!view) return;
    for (const item of navigation)
      item.classList.toggle("active", item === button);
    for (const item of document.querySelectorAll<HTMLElement>(".view"))
      item.classList.toggle("active", item.id === view);
  });
}

function setStatus(message: string) {
  if (status) status.textContent = message;
}

function setFieldErrors(name: string, url: string) {
  if (projectNameError) projectNameError.textContent = name;
  if (projectUrlError) projectUrlError.textContent = url;
}

async function getActiveSession() {
  return (await browser.storage.local.get("activeSession")).activeSession as
    | { id: string; projectId: string }
    | undefined;
}

async function loadReviewedPages() {
  if (!reviewedPages) return;
  const session = await getActiveSession();
  if (!session) {
    reviewedPages.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "empty",
        textContent: "Aún no hay páginas revisadas.",
      }),
    );
    return;
  }
  const pages = (await fetch(
    `http://127.0.0.1:4317/sessions/${encodeURIComponent(session.id)}/pages`,
  )
    .then((response) => (response.ok ? response.json() : []))
    .catch(() => [])) as Array<{
    url: string;
    title: string;
    analysisCount: number;
  }>;
  if (!pages.length) {
    reviewedPages.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "empty",
        textContent: "Aún no analizaste ninguna página.",
      }),
    );
    return;
  }
  reviewedPages.replaceChildren(
    ...pages.map((page) => {
      const item = document.createElement("p");
      item.className = "hint";
      item.textContent = `${page.title || page.url} · ${page.analysisCount} análisis`;
      return item;
    }),
  );
}

async function recordReviewedPage(snapshot: PageSnapshot) {
  const session = await getActiveSession();
  if (!session) return;
  await fetch(
    `http://127.0.0.1:4317/sessions/${encodeURIComponent(session.id)}/pages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: snapshot.url, title: snapshot.title }),
    },
  ).catch(() => undefined);
  await loadReviewedPages();
}

function hasProject() {
  return Boolean(projectSelect?.value);
}

async function updateAvailability() {
  const session = await getActiveSession();
  const projectReady = hasProject();
  const sessionReady = Boolean(session);
  for (const button of navigation) {
    const requiresReview = [
      "inspect",
      "spelling",
      "findings-view",
      "evidence",
    ].includes(button.dataset.view ?? "");
    button.disabled = requiresReview && (!projectReady || !sessionReady);
  }
  if (analyze) analyze.disabled = !sessionReady;
  if (select) select.disabled = !sessionReady;
  if (capture) capture.disabled = !sessionReady;
  if (refreshFindings) refreshFindings.disabled = !sessionReady;
  if (saveCandidates) saveCandidates.disabled = !sessionReady;
  if (checkSpellingButton) checkSpellingButton.disabled = !sessionReady;
  if (startSessionButton) startSessionButton.hidden = sessionReady;
  if (closeSessionButton) closeSessionButton.hidden = !sessionReady;
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function preferredTermsFrom(value: string) {
  return Object.fromEntries(
    parseLines(value)
      .map((line) => line.split(":").map((part) => part.trim()))
      .filter(
        (parts): parts is [string, string] =>
          parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]),
      ),
  );
}

async function loadProjectContext() {
  if (!projectSelect?.value) return;
  const response = await fetch(
    `http://127.0.0.1:4317/projects/${encodeURIComponent(projectSelect.value)}/context`,
  );
  if (!response.ok)
    return setStatus("No se pudo cargar el contexto del proyecto");
  currentProjectContext = (await response.json()) as ProjectContext;
  if (contextLanguage)
    contextLanguage.value = currentProjectContext.primaryLanguage;
  if (ignoredTerms)
    ignoredTerms.value = currentProjectContext.ignoredTerms.join("\n");
  if (preferredTerms)
    preferredTerms.value = Object.entries(currentProjectContext.preferredTerms)
      .map(([term, preferred]) => `${term}: ${preferred}`)
      .join("\n");
  if (reviewerNotes) reviewerNotes.value = currentProjectContext.reviewerNotes;
}

async function saveProjectContext() {
  if (!projectSelect?.value || !contextLanguage) return;
  const primaryLanguage = contextLanguage.value;
  const response = await fetch(
    `http://127.0.0.1:4317/projects/${encodeURIComponent(projectSelect.value)}/context`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        primaryLanguage,
        enabledLanguages: [primaryLanguage],
        ignoredTerms: parseLines(ignoredTerms?.value ?? ""),
        preferredTerms: preferredTermsFrom(preferredTerms?.value ?? ""),
        excludedSelectors: currentProjectContext?.excludedSelectors ?? [
          "pre",
          "code",
        ],
        reviewerNotes: reviewerNotes?.value.trim() ?? "",
      }),
    },
  );
  if (!response.ok) return setStatus("No se pudo guardar el contexto");
  currentProjectContext = (await response.json()) as ProjectContext;
  setStatus("Contexto lingüístico guardado");
}

function showView(view: string) {
  for (const button of navigation)
    button.classList.toggle("active", button.dataset.view === view);
  for (const item of document.querySelectorAll<HTMLElement>(".view"))
    item.classList.toggle("active", item.id === view);
}

async function loadProjects() {
  const projects = (await fetch("http://127.0.0.1:4317/projects")
    .then((response) => response.json())
    .catch(() => [])) as Array<{ id: string; name: string }>;
  projectSelect?.replaceChildren(
    new Option("Selecciona un proyecto", ""),
    ...projects.map((project) => new Option(project.name, project.id)),
  );
  const session = await getActiveSession();
  if (projectSelect && session) projectSelect.value = session.projectId;
  await updateAvailability();
}

async function loadHistory() {
  if (!historyView) return;
  const sessions = (await fetch("http://127.0.0.1:4317/sessions")
    .then((response) => response.json())
    .catch(() => [])) as Array<{
    id: string;
    projectId: string;
    status: string;
    startedAt: string;
    findingsCount: number;
  }>;
  const closed = sessions.filter((session) => session.status !== "active");
  if (!closed.length) {
    historyView.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "empty",
        textContent: "Todavía no hay revisiones finalizadas.",
      }),
    );
    return;
  }
  historyView.replaceChildren(
    ...closed.map((session) => {
      const item = document.createElement("article");
      item.textContent = `${session.id} · ${session.status} · ${new Date(session.startedAt).toLocaleString()} · ${session.findingsCount} hallazgos`;
      const button = document.createElement("button");
      button.className = "secondary";
      button.textContent = "Ver hallazgos";
      button.addEventListener("click", async () => {
        const findings = (await fetch(
          `http://127.0.0.1:4317/sessions/${encodeURIComponent(session.id)}/findings`,
        ).then((response) => response.json())) as Array<
          Record<string, unknown>
        >;
        renderFindings(findings);
        showView("findings-view");
      });
      item.append(button);
      return item;
    }),
  );
}

async function checkService() {
  const response = await browser.runtime
    .sendMessage({ type: "TAMANDUA_HEALTH" })
    .catch(() => ({ connected: false }));
  status?.replaceChildren(
    document.createTextNode(
      response.connected ? "Servicio conectado" : "Servicio desconectado",
    ),
  );
}

newProjectButton?.addEventListener("click", () => {
  if (projectForm) projectForm.hidden = !projectForm.hidden;
});

createProjectButton?.addEventListener("click", async () => {
  const name = projectName?.value.trim() ?? "";
  const baseUrl = projectUrl?.value.trim() ?? "";
  setFieldErrors(
    name ? "" : "El nombre es obligatorio.",
    /^https?:\/\//.test(baseUrl)
      ? ""
      : "Introduce una URL válida (http o https).",
  );
  if (!name || !/^https?:\/\//.test(baseUrl))
    return setStatus("Revisa los campos marcados");
  let response: Response;
  try {
    response = await fetch("http://127.0.0.1:4317/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        baseUrl,
        environment: "testing",
        language: "es-BO",
      }),
    });
  } catch {
    return setStatus("No se pudo conectar con el servicio");
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    return setStatus(error.error?.message ?? "No se pudo crear el proyecto");
  }
  setFieldErrors("", "");
  await loadProjects();
  if (projectName) projectName.value = "";
  if (projectUrl) projectUrl.value = "";
  if (projectForm) projectForm.hidden = true;
  setStatus("Proyecto creado");
});

projectSelect?.addEventListener("change", () => {
  void updateAvailability();
  currentProjectContext = undefined;
  void loadProjectContext();
  setStatus(
    projectSelect.value ? "Proyecto seleccionado" : "Selecciona un proyecto",
  );
});

saveContextButton?.addEventListener("click", () => void saveProjectContext());

analyze?.addEventListener("click", async () => {
  if (!(await getActiveSession()))
    return setStatus("Inicia una revisión primero");
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus("No se encontró una pestaña activa");
  let snapshot: unknown;
  try {
    snapshot = await browser.tabs.sendMessage(tab.id, {
      type: "TAMANDUA_ANALYZE_PAGE",
    });
  } catch {
    return setStatus(
      `No se pudo conectar con la pestaña ${tab.url ?? "actual"}. Recárgala e inténtalo de nuevo.`,
    );
  }
  if (!snapshot || typeof snapshot !== "object")
    return setStatus(
      `La pestaña no devolvió un snapshot válido (${tab.url ?? "URL desconocida"}). Recarga la pestaña e inténtalo de nuevo.`,
    );
  lastSnapshot = snapshot as PageSnapshot;
  await recordReviewedPage(lastSnapshot);
  if (copyPromptButton) copyPromptButton.disabled = false;
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
    .then(async (response) =>
      response.ok
        ? response.json()
        : { error: { message: `Error del servicio (${response.status})` } },
    )
    .catch(() => ({
      error: { message: "No se pudo conectar con el servicio." },
    }));
  if (
    analysis &&
    typeof analysis === "object" &&
    "findings" in analysis &&
    Array.isArray(analysis.findings)
  )
    lastCandidates = analysis.findings as Array<Record<string, unknown>>;
  if (result)
    result.textContent = JSON.stringify({ snapshot, analysis }, null, 2);
});

function renderSpellingFindings(issues: SpellingIssue[], url: string) {
  if (!spellingFindings) return;
  if (!issues.length) {
    spellingFindings.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "empty",
        textContent: "No se detectaron posibles problemas en el texto visible.",
      }),
    );
    return;
  }
  spellingFindings.replaceChildren(
    ...issues.map((issue) => {
      const item = document.createElement("article");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent =
        issue.provider === "languagetool" ? "GRAMÁTICA" : "ESTILO LOCAL";
      const title = document.createElement("h3");
      title.textContent = issue.text;
      const detail = document.createElement("p");
      detail.className = "hint";
      detail.textContent = issue.message;
      const context = document.createElement("p");
      context.className = "hint";
      context.textContent = issue.context
        ? `Contexto: ${issue.context}`
        : "Sin contexto disponible";
      item.append(badge, title, detail, context);
      if (issue.replacements.length) {
        const suggestion = document.createElement("p");
        suggestion.className = "hint";
        suggestion.textContent = `Sugerencia: ${issue.replacements.join(", ")}`;
        item.append(suggestion);
      }
      const actions = document.createElement("div");
      actions.className = "finding-actions";
      const locate = document.createElement("button");
      locate.className = "secondary";
      locate.textContent = "Ver en página";
      locate.addEventListener("click", async () => {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id || !issue.selector)
          return setStatus("No hay ubicación para este texto");
        const response = await browser.tabs.sendMessage(tab.id, {
          type: "TAMANDUA_HIGHLIGHT_TEXT",
          selector: issue.selector,
          ...(issue.offset === undefined ? {} : { offset: issue.offset }),
          ...(issue.length === undefined ? {} : { length: issue.length }),
        });
        setStatus(
          response?.found
            ? "Texto resaltado en la página"
            : "No se pudo resaltar el texto",
        );
      });
      const confirm = document.createElement("button");
      confirm.textContent = "Es bug";
      confirm.addEventListener("click", async () => {
        const sessionId = (await getActiveSession())?.id;
        if (!sessionId) return setStatus("Inicia una revisión primero");
        const response = await fetch("http://127.0.0.1:4317/findings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            origin: "automatic",
            ruleId: issue.ruleId,
            category: "content",
            title: `Redacción: ${issue.text}`,
            description: issue.message,
            actualResult: issue.context ?? issue.text,
            expectedResult:
              issue.replacements[0] ?? "Revisar la redacción indicada.",
            severity: "minor",
            priority: "low",
            confidence: issue.provider === "languagetool" ? 0.8 : 0.9,
            url,
            ...(issue.selector
              ? {
                  selector: issue.selector,
                  elementText: issue.context ?? issue.text,
                  elementTag: issue.source ?? "text",
                }
              : {}),
          }),
        });
        if (!response.ok) return setStatus("No se pudo registrar el hallazgo");
        item.remove();
        setStatus("Hallazgo registrado como pendiente de revisión");
      });
      const dismiss = document.createElement("button");
      dismiss.className = "secondary";
      dismiss.textContent = "No es bug";
      dismiss.addEventListener("click", () => {
        item.remove();
        setStatus("Resultado descartado para esta revisión");
      });
      const ignore = document.createElement("button");
      ignore.className = "secondary";
      ignore.textContent = "Ignorar término";
      ignore.addEventListener("click", async () => {
        if (!currentProjectContext) await loadProjectContext();
        if (!currentProjectContext) return;
        currentProjectContext.ignoredTerms = [
          ...new Set([...currentProjectContext.ignoredTerms, issue.text]),
        ];
        if (ignoredTerms)
          ignoredTerms.value = currentProjectContext.ignoredTerms.join("\n");
        await saveProjectContext();
        item.remove();
        setStatus(`"${issue.text}" se ignorará en este proyecto`);
      });
      actions.append(locate, confirm, dismiss, ignore);
      item.append(actions);
      return item;
    }),
  );
}

checkSpellingButton?.addEventListener("click", async () => {
  const session = await getActiveSession();
  if (!session || !projectSelect?.value)
    return setStatus("Inicia una revisión primero");
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url)
    return setStatus("No se encontró una pestaña activa");
  if (!currentProjectContext) await loadProjectContext();
  const blocks = await browser.tabs.sendMessage(tab.id, {
    type: "TAMANDUA_GET_TEXT_BLOCKS",
  });
  if (!Array.isArray(blocks) || !blocks.length)
    return setStatus("No se encontró texto visible para revisar");
  const response = await fetch("http://127.0.0.1:4317/spelling/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: projectSelect.value, blocks }),
  });
  if (!response.ok) return setStatus("No se pudo revisar la redacción");
  const analysis = (await response.json()) as { findings: SpellingIssue[] };
  if (spellingSummary)
    spellingSummary.textContent = `${analysis.findings.length} posibles problemas en ${blocks.length} bloques de texto.`;
  renderSpellingFindings(analysis.findings, tab.url);
});

reloadTab?.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus("No se encontró una pestaña activa");
  try {
    await browser.tabs.reload(tab.id);
    setStatus(
      "Pestaña recargada. Espera a que termine y pulsa Analizar pantalla.",
    );
  } catch {
    setStatus("No se pudo recargar esta pestaña. Prueba manualmente.");
  }
});

copyPromptButton?.addEventListener("click", async () => {
  if (!lastSnapshot) return setStatus("Analiza una pantalla primero");
  try {
    await navigator.clipboard.writeText(createAnalysisPrompt(lastSnapshot));
    const originalLabel = copyPromptButton.textContent;
    copyPromptButton.textContent = "Prompt copiado ✓";
    setStatus(
      "Prompt copiado correctamente. Pégalo en ChatGPT y trae la respuesta JSON.",
    );
    window.setTimeout(() => {
      copyPromptButton.textContent = originalLabel ?? "Copiar prompt";
    }, 2500);
  } catch {
    setStatus(
      "No se pudo copiar automáticamente. Revisa los permisos del portapapeles.",
    );
  }
});

importAIButton?.addEventListener("click", async () => {
  if (aiError) aiError.textContent = "";
  const sessionId = (await getActiveSession())?.id;
  if (!sessionId) return setStatus("Inicia una revisión primero");
  if (!lastSnapshot || !aiResponse?.value.trim())
    return setStatus("Analiza una pantalla y pega una respuesta primero");
  try {
    const candidates = parseAIResponse(aiResponse.value);
    for (const candidate of candidates)
      await fetch("http://127.0.0.1:4317/findings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...candidate,
          sessionId,
          origin: "automatic",
          url: lastSnapshot.url,
        }),
      });
    setStatus(`${candidates.length} candidatos importados`);
    aiResponse.value = "";
    await refreshFindings?.click();
  } catch (error) {
    if (aiError)
      aiError.textContent =
        error instanceof Error
          ? `Respuesta inválida: ${error.message}`
          : "La respuesta no es un JSON válido.";
  }
});

function renderFindings(items: Array<Record<string, unknown>>) {
  if (!findingsView) return;
  if (!items.length) {
    findingsView.replaceChildren(
      Object.assign(document.createElement("p"), {
        className: "empty",
        textContent: "No hay hallazgos para este filtro.",
      }),
    );
    return;
  }
  findingsView.replaceChildren(
    ...items.map((finding) => {
      const item = document.createElement("article");
      const label = document.createElement("span");
      const labels: Record<string, string> = {
        candidate: "PENDIENTE",
        confirmed: "CONFIRMADO",
        discarded: "NO ES BUG",
        duplicate: "DUPLICADO",
        resolved: "RESUELTO",
      };
      label.className = "badge";
      label.textContent = labels[String(finding.status)] ?? "PENDIENTE";
      const title = document.createElement("h3");
      title.textContent = String(finding.title ?? "Hallazgo");
      item.append(label, title);
      const summary = document.createElement("p");
      summary.className = "hint";
      summary.textContent = `${String(finding.origin ?? "manual")} · ${String(finding.category ?? "other")} · ${String(finding.severity ?? "minor")} · prioridad ${String(finding.priority ?? "medium")}`;
      item.append(summary);
      const element = finding.element as
        | { selector?: string; visibleText?: string }
        | undefined;
      if (element?.selector) {
        const location = document.createElement("p");
        location.className = "hint";
        location.textContent = `${element.selector}${element.visibleText ? ` · "${element.visibleText}"` : ""}`;
        item.append(location);
        const locate = document.createElement("button");
        locate.className = "secondary";
        locate.textContent = "Ver elemento";
        locate.addEventListener("click", async (event) => {
          event.stopPropagation();
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id) return setStatus("No se encontró una pestaña activa");
          const response = await browser.tabs.sendMessage(tab.id, {
            type: "TAMANDUA_HIGHLIGHT_ELEMENT",
            selector: element.selector,
          });
          setStatus(
            response?.found
              ? "Elemento resaltado en la página"
              : "No se encontró el selector en la página actual",
          );
        });
        item.append(locate);
      }
      if (typeof finding.id === "string") {
        item.addEventListener("click", () => {
          selectedFindingId = finding.id as string;
        });
        const actions = document.createElement("div");
        actions.className = "finding-actions";
        const currentStatus = String(finding.status ?? "candidate");
        for (const [action, statusValue] of [
          ["Confirmar como bug", "confirmed"],
          ["No es bug", "discarded"],
          ["Marcar duplicado", "duplicate"],
        ] as const) {
          if (currentStatus !== "candidate") continue;
          const button = document.createElement("button");
          if (statusValue !== "confirmed") button.className = "secondary";
          button.textContent = action;
          button.addEventListener("click", async () => {
            const response = await fetch(
              `http://127.0.0.1:4317/findings/${encodeURIComponent(finding.id as string)}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: statusValue }),
              },
            );
            if (!response.ok)
              return setStatus("No se pudo actualizar el hallazgo");
            setStatus(
              `Hallazgo marcado como ${labels[statusValue] ?? statusValue}`,
            );
            await refreshFindings?.click();
          });
          actions.append(button);
        }
        const evidence = document.createElement("button");
        evidence.className = "secondary";
        evidence.textContent = "Capturar evidencia";
        evidence.addEventListener(
          "click",
          () =>
            void captureFindingEvidence(
              finding.id as string,
              element?.selector,
            ),
        );
        actions.append(evidence);
        item.append(actions);
        const detail = document.createElement("details");
        const detailSummary = document.createElement("summary");
        detailSummary.textContent = "Editar detalle";
        const titleInput = document.createElement("input");
        titleInput.value = String(finding.title ?? "");
        const description = document.createElement("textarea");
        description.rows = 4;
        description.value = String(finding.description ?? "");
        detail.append(detailSummary, titleInput, description);
        if (!["discarded", "duplicate"].includes(currentStatus)) {
          const save = document.createElement("button");
          save.className = "secondary";
          save.textContent = "Guardar cambios";
          save.addEventListener("click", async () => {
            const response = await fetch(
              `http://127.0.0.1:4317/findings/${encodeURIComponent(finding.id as string)}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  title: titleInput.value.trim(),
                  description: description.value.trim(),
                }),
              },
            );
            if (!response.ok) return setStatus("No se pudo editar el hallazgo");
            setStatus("Hallazgo actualizado");
            await refreshFindings?.click();
          });
          detail.append(save);
        }
        item.append(detail);
      }
      return item;
    }),
  );
}

async function captureFindingEvidence(findingId: string, selector?: string) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.windowId || !tab.url)
    return setStatus("No se encontró una pestaña activa");
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
  });
  const response = await fetch("http://127.0.0.1:4317/evidence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      findingId,
      type: selector ? "element-screenshot" : "full-page-screenshot",
      dataUrl,
      url: tab.url,
      browser: "Chromium",
      resolution: `${window.screen.width}x${window.screen.height}`,
      ...(selector ? { selector } : {}),
    }),
  });
  setStatus(
    response.ok ? "Evidencia guardada" : "No se pudo guardar la evidencia",
  );
}

refreshFindings?.addEventListener("click", async () => {
  const sessionId = (await getActiveSession())?.id;
  if (!sessionId) return setStatus("Inicia una sesión primero");
  const response = await fetch(
    `http://127.0.0.1:4317/sessions/${encodeURIComponent(sessionId)}/findings`,
  );
  const findings = (await response.json()) as Array<Record<string, unknown>>;
  renderFindings(
    findings.filter(
      (finding) =>
        (!filter?.value ||
          filter.value === "all" ||
          finding.status === filter.value) &&
        (!originFilter?.value ||
          originFilter.value === "all" ||
          finding.origin === originFilter.value) &&
        (!categoryFilter?.value ||
          categoryFilter.value === "all" ||
          finding.category === categoryFilter.value) &&
        (!severityFilter?.value ||
          severityFilter.value === "all" ||
          finding.severity === severityFilter.value),
    ),
  );
});

filter?.addEventListener("change", () => refreshFindings?.click());
originFilter?.addEventListener("change", () => refreshFindings?.click());
categoryFilter?.addEventListener("change", () => refreshFindings?.click());
severityFilter?.addEventListener("change", () => refreshFindings?.click());

saveCandidates?.addEventListener("click", async () => {
  await registerCandidates();
});

async function registerCandidates() {
  const sessionId = (await getActiveSession())?.id;
  if (!sessionId) return setStatus("Inicia una sesión primero");
  for (const candidate of lastCandidates)
    await fetch("http://127.0.0.1:4317/findings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...candidate, sessionId, origin: "rule" }),
    });
  setStatus(
    lastCandidates.length
      ? "Candidatos registrados"
      : "No se encontraron candidatos",
  );
  lastCandidates = [];
  await refreshFindings?.click();
}

startSessionButton?.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return setStatus("Abre una página web antes de iniciar");
  let currentUrl: URL;
  try {
    currentUrl = new URL(tab.url);
  } catch {
    return setStatus("La pestaña actual no tiene una URL compatible");
  }
  if (!/^https?:$/.test(currentUrl.protocol))
    return setStatus("Abre una página http o https antes de iniciar");
  const projects = (await fetch("http://127.0.0.1:4317/projects").then(
    (response) => response.json(),
  )) as Array<{ id: string; name: string; baseUrl: string }>;
  let project = projects.find((item) => item.baseUrl === currentUrl.origin);
  if (!project) {
    const response = await fetch("http://127.0.0.1:4317/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: currentUrl.hostname,
        description: "Proyecto creado automáticamente desde una revisión.",
        baseUrl: currentUrl.origin,
        environment: "navegación",
        language: "es-BO",
      }),
    });
    if (!response.ok)
      return setStatus("No se pudo crear el proyecto automático");
    project = (await response.json()) as {
      id: string;
      name: string;
      baseUrl: string;
    };
    await loadProjects();
  }
  if (projectSelect) projectSelect.value = project.id;
  await loadProjectContext();
  const response = await fetch("http://127.0.0.1:4317/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      projectId: project.id,
      mode: "manual",
      browser: navigator.userAgent.includes("Firefox") ? "Firefox" : "Chromium",
      resolution: `${window.screen.width}x${window.screen.height}`,
      initialUrl: currentUrl.href,
    }),
  });
  const session = (await response.json()) as { id: string; projectId: string };
  await browser.storage.local.set({ activeSession: session });
  if (sessionView) sessionView.textContent = `Sesión activa: ${session.id}`;
  if (sessionSummary)
    sessionSummary.textContent = `Revisión activa para ${project.name}. Ya puedes analizar la pestaña actual.`;
  setStatus("Revisión iniciada desde la pestaña actual");
  await updateAvailability();
  await loadReviewedPages();
  showView("inspect");
});

closeSessionButton?.addEventListener("click", async () => {
  const session = await getActiveSession();
  if (!session) return setStatus("No hay una sesión activa");
  await fetch(
    `http://127.0.0.1:4317/sessions/${encodeURIComponent(session.id)}/close`,
    { method: "POST" },
  );
  await browser.storage.local.remove("activeSession");
  if (sessionView) sessionView.textContent = "Sin sesión activa";
  if (sessionSummary)
    sessionSummary.textContent =
      "Revisión finalizada. Puedes consultar sus hallazgos en Historial.";
  setStatus("Revisión finalizada");
  await updateAvailability();
  await loadReviewedPages();
  await loadHistory();
  showView("session");
});

loadHistoryButton?.addEventListener("click", () => void loadHistory());

select?.addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus("No se encontró una pestaña activa");
  try {
    await browser.tabs.sendMessage(tab.id, { type: "TAMANDUA_START_SELECTOR" });
    setStatus("Selecciona un elemento en la página");
  } catch {
    setStatus(
      "No se pudo activar el selector. Recarga la página e inténtalo de nuevo.",
    );
  }
});

browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.type !== "TAMANDUA_ELEMENT_SELECTED_FORWARD") return;
  if (result) result.textContent = JSON.stringify(message.element, null, 2);
  selectedElement = message.element as { selector?: string };
  selectedFindingId = undefined;
  const selected = message.element as ElementSnapshot;
  if (manualSelection)
    manualSelection.textContent = selected.selector
      ? `Elemento seleccionado: ${selected.selector}`
      : "Elemento seleccionado";
  if (lastSnapshot) {
    const element = message.element as ElementSnapshot;
    lastSnapshot = {
      ...lastSnapshot,
      controls: [element],
      texts: element.visibleText ? [element.visibleText] : [],
      headings: [],
      images: [],
    };
  }
  if (status) status.textContent = "Elemento seleccionado";
});

createManualFinding?.addEventListener("click", async () => {
  const sessionId = (await getActiveSession())?.id;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const title = manualTitle?.value.trim() ?? "";
  const description = manualDescription?.value.trim() ?? "";
  if (!sessionId || !tab?.url)
    return setStatus("Inicia una revisión y selecciona una página primero");
  if (!title || !description)
    return setStatus("El título y la descripción son obligatorios");
  const element = selectedElement as ElementSnapshot | undefined;
  const response = await fetch("http://127.0.0.1:4317/findings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId,
      origin: "manual",
      category: manualCategory?.value ?? "functional",
      title,
      description,
      severity: manualSeverity?.value ?? "minor",
      priority: manualPriority?.value ?? "medium",
      confidence: 1,
      url: tab.url,
      ...(element?.selector
        ? {
            selector: element.selector,
            elementText: element.visibleText,
            elementTag: element.tagName,
          }
        : {}),
    }),
  });
  if (!response.ok) return setStatus("No se pudo registrar el hallazgo manual");
  if (manualTitle) manualTitle.value = "";
  if (manualDescription) manualDescription.value = "";
  setStatus("Hallazgo manual registrado como pendiente de revisión");
  showView("findings-view");
  await refreshFindings?.click();
});

capture?.addEventListener("click", async () => {
  const findingId = selectedFindingId;
  if (!findingId)
    return setStatus("Selecciona primero un hallazgo desde Hallazgos");
  await captureFindingEvidence(findingId, selectedElement?.selector);
});

await checkService();
await loadProjects();
await loadProjectContext();
await loadHistory();
const session = await getActiveSession();
if (sessionView && session)
  sessionView.textContent = `Sesión activa: ${session.id}`;
await updateAvailability();
await loadReviewedPages();
