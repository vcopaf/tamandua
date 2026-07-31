import { readFile } from "node:fs/promises";
import { scenarioSchema } from "@tamandua/core";
import type { Scenario } from "@tamandua/core";
import { parse } from "yaml";
import { z } from "zod";

const scenarioFileSchema = scenarioSchema
  .omit({ id: true, projectId: true })
  .extend({
    startUrl: z.string().min(1),
  });

export async function loadScenario(
  path: string,
): Promise<Omit<Scenario, "id" | "projectId">> {
  const content = await readFile(path, "utf8");
  return scenarioFileSchema.parse(parse(content));
}
