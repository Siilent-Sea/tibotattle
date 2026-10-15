import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

// Mandatory in the Ubuntu workflow contract step. Keep this executable Bash
// proof outside the portable root test/*.test.js discovery; it never skips.
test("the actual Worker shell preserves gate failures and cancellation and reaps its sampler", async () => {
  const workflow = await readFile(new URL("../.github/workflows/hosted-backend.yml", import.meta.url), "utf8");
  const matches = [...workflow.matchAll(/      - name: Run the Worker gate\n(?:        #[^\n]*\n)*        run: \|\n((?:          .*\n)+)/gu)];
  assert.equal(matches.length, 1, "the actual Worker run block exists exactly once");
  const script = matches[0][1].replace(/^ {10}/gmu, "");
  const root = await mkdtemp(join(tmpdir(), "worker-resource-sampler-test-"));
  const samplerPath = join(root, "sampler.json");
  try {
    await writeFile(join(root, "vmstat"), `#!${process.execPath}
const fs = require("node:fs");
process.on("SIGTERM", () => { fs.writeFileSync("sampler-stopped", "yes"); process.exit(0); });
fs.writeFileSync("sampler.json", JSON.stringify({ pid: process.pid, args: process.argv.slice(2) }));
if (process.env.SAMPLER_EXIT !== "0") process.exit(Number(process.env.SAMPLER_EXIT));
setInterval(() => {}, 1000);
`, { mode: 0o700 });
    await writeFile(join(root, "npm"), `#!${process.execPath}
const fs = require("node:fs");
fs.writeFileSync("gate.json", JSON.stringify(process.argv.slice(2)));
(async () => {
  for (let i = 0; !fs.existsSync("sampler.json") && i < 100; i++) await new Promise(r => setTimeout(r, 10));
  if (!fs.existsSync("sampler.json")) process.exit(99);
  if (process.env.SAMPLER_EXIT !== "0") await new Promise(r => setTimeout(r, 100));
  if (process.env.GATE_SIGNAL) process.kill(process.ppid, process.env.GATE_SIGNAL);
  process.exit(Number(process.env.GATE_EXIT));
})();
`, { mode: 0o700 });
    for (const [gate, sampler, signal, expected] of [
      [0, 0, "", 0], [23, 0, "", 23], [0, 9, "", 1], [23, 9, "", 23],
      [0, 0, "SIGINT", 130], [0, 0, "SIGTERM", 143],
    ]) {
      await rm(samplerPath, { force: true });
      await rm(join(root, "sampler-stopped"), { force: true });
      let samplerReaped = false;
      try {
        const result = spawnSync("/bin/bash", ["--noprofile", "--norc", "-c", script], {
          cwd: root,
          env: { PATH: `${root}:/usr/bin:/bin`, GATE_EXIT: String(gate), SAMPLER_EXIT: String(sampler), GATE_SIGNAL: signal },
          encoding: "utf8", timeout: 5000,
        });
        assert.equal(result.error, undefined);
        assert.equal(result.status, expected, `gate=${gate}, sampler=${sampler}, signal=${signal}`);
        assert.deepEqual(JSON.parse(await readFile(join(root, "gate.json"), "utf8")), ["--prefix", "apps/worker", "run", "check"]);
        const state = JSON.parse(await readFile(samplerPath, "utf8"));
        assert.deepEqual(state.args, ["-w", "-t", "30"]);
        assert.throws(() => process.kill(state.pid, 0), { code: "ESRCH" }, "the owned sampler was reaped");
        samplerReaped = true;
        if (sampler === 0) assert.equal(await readFile(join(root, "sampler-stopped"), "utf8"), "yes");
      } finally {
        // A broken cleanup regression must not leave the synthetic sampler alive.
        if (!samplerReaped) {
          try { process.kill(JSON.parse(await readFile(samplerPath, "utf8")).pid, "SIGKILL"); }
          catch (error) { if (!["ENOENT", "ESRCH"].includes(error.code)) throw error; }
        }
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
