import { writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadScenario } from "./scenario.js";

describe("scenario loader", () => {
  it("loads and validates YAML scenarios", async () => {
    const path = "/tmp/tamandua-scenario.yml";
    await writeFile(
      path,
      "name: Registro\nstartUrl: /registro\nsteps:\n  - action: click\n    target: '#save'\nchecks:\n  - type: text-visible\n    value: Listo\n",
    );
    const scenario = await loadScenario(path);
    expect(scenario.name).toBe("Registro");
    expect(scenario.steps).toHaveLength(1);
  });
});
