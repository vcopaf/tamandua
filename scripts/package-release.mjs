import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const output = "release";
const source = "extension/.output/chrome-mv3";
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await execFileAsync(
  "zip",
  ["-qr", resolve("release/tamandua-0.1.0-extension.zip"), "."],
  { cwd: source },
);
console.log("Created release/tamandua-0.1.0-extension.zip");
