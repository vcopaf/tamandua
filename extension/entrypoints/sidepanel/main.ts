import { createAnalysisPrompt, parseAIResponse } from "@tamandua/core/ai";
import type { PageSnapshot } from "@tamandua/core/schemas";
import type { ExtensionMessage } from "../../utils/messages.js";

const status = document.querySelector<HTMLParagraphElement>("#status");
const result = document.querySelector<HTMLPreElement>("#result");
const analyze = document.querySelector<HTMLButtonElement>("#analyze");
const select = document.querySelector<HTMLButtonElement>("#select");
const reloadTab = document.querySelector<HTMLButtonElement>("#reload-tab");
const capture = document.querySelector<HTMLButtonElement>("#capture");
const filter = document.querySelector<HTMLSelectElement>("#finding-filter");
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
let selectedElement: { selector?: string } | undefined;
let lastCandidates: Array<Record<string, unknown>> = [];
let selectedFindingId: string | undefined;
let lastSnapshot: PageSnapshot | undefined;

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

function hasProject() {
  return Boolean(projectSelect?.value);
}

async function updateAvailability() {
  const session = await getActiveSession();
  const projectReady = hasProject();
  const sessionReady = Boolean(session);
  for (const button of navigation) {
    const requiresReview = ["inspect", "findings-view", "evidence"].includes(
      button.dataset.view ?? "",
    );
    button.disabled = requiresReview && (!projectReady || !sessionReady);
  }
  if (analyze) analyze.disabled = !sessionReady;
  if (select) select.disabled = !sessionReady;
  if (capture) capture.disabled = !sessionReady;
  if (refreshFindings) refreshFindings.disabled = !sessionReady;
  if (saveCandidates) saveCandidates.disabled = !sessionReady;
  if (startSessionButton)
    startSessionButton.hidden = !projectReady || sessionReady;
  if (closeSessionButton) closeSessionButton.hidden = !sessionReady;
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
  setStatus(
    projectSelect.value ? "Proyecto seleccionado" : "Selecciona un proyecto",
  );
});

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
  await registerCandidates();
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
  await navigator.clipboard.writeText(createAnalysisPrompt(lastSnapshot));
  setStatus("Prompt copiado. Pégalo en ChatGPT y trae la respuesta JSON.");
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
      label.textContent = `${String(finding.title ?? "Hallazgo")} [${String(finding.status ?? "candidate")}]`;
      item.append(label);
      if (typeof finding.id === "string") {
        item.addEventListener("click", () => {
          selectedFindingId = finding.id as string;
          setStatus("Hallazgo seleccionado para evidencia");
        });
        for (const [action, statusValue] of [
          ["Confirmar", "confirmed"],
          ["Descartar", "discarded"],
        ] as const) {
          const button = document.createElement("button");
          button.textContent = action;
          button.addEventListener("click", async () => {
            await fetch(
              `http://127.0.0.1:4317/findings/${encodeURIComponent(finding.id as string)}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: statusValue }),
              },
            );
            if (status) status.textContent = `Hallazgo ${statusValue}`;
          });
          item.append(button);
        }
      }
      return item;
    }),
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
    filter?.value && filter.value !== "all"
      ? findings.filter((finding) => finding.status === filter.value)
      : findings,
  );
});

filter?.addEventListener("change", () => refreshFindings?.click());

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
  await refreshFindings?.click();
}

startSessionButton?.addEventListener("click", async () => {
  if (!projectSelect?.value) return setStatus("Selecciona un proyecto");
  const projects = (await fetch("http://127.0.0.1:4317/projects").then(
    (response) => response.json(),
  )) as Array<{ id: string; baseUrl: string }>;
  const project = projects.find((item) => item.id === projectSelect.value);
  if (!project) return setStatus("Proyecto no encontrado");
  const response = await fetch("http://127.0.0.1:4317/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      projectId: project.id,
      mode: "manual",
      browser: "Firefox",
      resolution: `${window.screen.width}x${window.screen.height}`,
      initialUrl: project.baseUrl,
    }),
  });
  const session = (await response.json()) as { id: string; projectId: string };
  await browser.storage.local.set({ activeSession: session });
  if (sessionView) sessionView.textContent = `Sesión activa: ${session.id}`;
  if (sessionSummary)
    sessionSummary.textContent =
      "Revisión activa. Ya puedes analizar la pestaña actual.";
  setStatus("Revisión iniciada");
  await updateAvailability();
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
  if (status) status.textContent = "Elemento seleccionado";
});

capture?.addEventListener("click", async () => {
  const findingId = selectedFindingId;
  if (!findingId)
    return setStatus("Selecciona primero un hallazgo desde Hallazgos");
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
await loadProjects();
await loadHistory();
const session = await getActiveSession();
if (sessionView && session)
  sessionView.textContent = `Sesión activa: ${session.id}`;
await updateAvailability();
