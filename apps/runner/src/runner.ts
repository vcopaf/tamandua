import { mkdir } from "node:fs/promises";
import { createId } from "@tamandua/core";
import type { RuleResult, Scenario } from "@tamandua/core";
import { type Browser, type Page, chromium } from "playwright";

export type ExecutionResult = {
  id: string;
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  error?: string;
  screenshotPath?: string;
  tracePath?: string;
  consoleErrors: TechnicalEvent[];
  serverErrors: TechnicalEvent[];
  technicalFindings: RuleResult[];
  steps: Array<{
    position: number;
    action: string;
    status: "passed" | "failed";
    error?: string;
  }>;
};

export type TechnicalEvent = {
  url: string;
  timestamp: string;
  message: string;
  status?: number;
};

export function sanitizeMessage(message: string): string {
  return message
    .replace(
      /(authorization|cookie|set-cookie|token|password)\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
      "$1=[REDACTED]",
    )
    .slice(0, 1000);
}

async function performStep(page: Page, step: Scenario["steps"][number]) {
  if (step.action === "goto") return page.goto(step.value ?? step.target ?? "");
  if (step.action === "fill")
    return page.locator(step.target ?? "").fill(step.value ?? "");
  if (step.action === "click") return page.locator(step.target ?? "").click();
  if (step.action === "wait")
    return page.waitForTimeout(Number(step.value ?? 1000));
}

async function verifyCheck(
  page: Page,
  check: Scenario["checks"][number],
  consoleErrors: TechnicalEvent[],
  serverErrors: TechnicalEvent[],
) {
  if (check.type === "text-visible")
    return page.getByText(check.value ?? "").isVisible();
  if (check.type === "url") return page.url() === check.value;
  if (check.type === "no-console-errors") return consoleErrors.length === 0;
  if (check.type === "no-server-errors") return serverErrors.length === 0;
  return false;
}

export async function runScenario(
  scenario: Scenario,
  options: { baseUrl: string; outputDirectory: string; browser?: Browser },
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();
  const executionId = createId();
  const browser =
    options.browser ?? (await chromium.launch({ headless: true }));
  const ownsBrowser = !options.browser;
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: TechnicalEvent[] = [];
  const serverErrors: TechnicalEvent[] = [];
  page.on("console", (message) => {
    if (message.type() === "error")
      consoleErrors.push({
        url: page.url(),
        timestamp: new Date().toISOString(),
        message: sanitizeMessage(message.text()),
      });
  });
  page.on("response", (response) => {
    if (response.status() >= 500)
      serverErrors.push({
        url: response.url(),
        timestamp: new Date().toISOString(),
        status: response.status(),
        message: `HTTP ${response.status()}`,
      });
  });
  await mkdir(options.outputDirectory, { recursive: true });
  const tracePath = `${options.outputDirectory}/${executionId}.zip`;
  const screenshotPath = `${options.outputDirectory}/${executionId}.png`;
  await context.tracing.start({ screenshots: true, snapshots: true });
  const steps: ExecutionResult["steps"] = [];
  try {
    await page.goto(new URL(scenario.startUrl, options.baseUrl).toString());
    for (const [index, step] of scenario.steps.entries()) {
      try {
        await performStep(page, step);
        steps.push({ position: index, action: step.action, status: "passed" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Step failed";
        steps.push({
          position: index,
          action: step.action,
          status: "failed",
          error: message,
        });
        throw new Error(`Step ${index + 1} failed: ${message}`);
      }
    }
    for (const check of scenario.checks)
      if (!(await verifyCheck(page, check, consoleErrors, serverErrors)))
        throw new Error(`Check failed: ${check.type}`);
    await context.tracing.stop();
    return {
      id: executionId,
      status: "passed",
      startedAt,
      finishedAt: new Date().toISOString(),
      steps,
      consoleErrors,
      serverErrors,
      technicalFindings: technicalFindings(
        scenario,
        consoleErrors,
        serverErrors,
      ),
    };
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await context.tracing.stop({ path: tracePath });
    return {
      id: executionId,
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Execution failed",
      screenshotPath,
      tracePath,
      steps,
      consoleErrors,
      serverErrors,
      technicalFindings: technicalFindings(
        scenario,
        consoleErrors,
        serverErrors,
      ),
    };
  } finally {
    await context.close();
    if (ownsBrowser) await browser.close();
  }
}

export function technicalFindings(
  scenario: Scenario,
  consoleErrors: TechnicalEvent[],
  serverErrors: TechnicalEvent[],
): RuleResult[] {
  const url = new URL(scenario.startUrl, "http://tamandua.local").toString();
  return [
    ...(consoleErrors.length
      ? [
          {
            ruleId: "TECH_CONSOLE_ERROR",
            status: "candidate" as const,
            confidence: 1,
            category: "technical" as const,
            title: "Error de consola",
            description:
              consoleErrors[0]?.message ?? "Se registró un error de consola.",
            url,
          },
        ]
      : []),
    ...(serverErrors.length
      ? [
          {
            ruleId: "TECH_HTTP_SERVER_ERROR",
            status: "candidate" as const,
            confidence: 1,
            category: "technical" as const,
            title: "Error HTTP del servidor",
            description:
              serverErrors[0]?.message ?? "Se registró una respuesta 5xx.",
            url,
          },
        ]
      : []),
  ];
}
