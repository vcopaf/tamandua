import { createDatabase } from "@tamandua/persistence";
import { describe, expect, it } from "vitest";
import { createApp } from "./server.js";

describe("local service", () => {
  it("reports health and validates project requests", async () => {
    const app = await createApp(await createDatabase());
    await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
    const address = app.address();
    if (!address || typeof address === "string")
      throw new Error("Server did not bind");

    const health = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok", service: "tamandua" });

    const invalid = await fetch(`http://127.0.0.1:${address.port}/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Invalid" }),
    });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
    await new Promise<void>((resolve, reject) =>
      app.close((error) => (error ? reject(error) : resolve())),
    );
  });
});
