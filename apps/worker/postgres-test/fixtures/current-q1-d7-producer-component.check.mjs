import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createServer } from "vite";

import { captureCurrentQ1D7ReferenceBinding, currentQ1D7ViteOptions }
  from "./current-q1-d7-reference.mjs";
import { invokeCurrentQ1D7Compute } from "./current-q1-d7-native.mjs";
import { clearCurrentQ1D7PrivateValidatedOracle } from "./current-q1-d7-case-output.mjs";
import * as Contract from "./current-q1-d7-contract.mjs";
import * as D1 from "./current-q1-d1-reference.mjs";

const FIXTURE = new URL("./current-q1-d7-reference.mjs", import.meta.url);
const EXPECTATION_CHECK = new URL("./current-q1-d7-expectation.check.mjs", import.meta.url);
const D1_FIXTURE = new URL("./current-q1-d1-reference.mjs", import.meta.url);

test("static producer capture binds the current runtime, closure, and both corpora", async () => {
  const binding = await captureCurrentQ1D7ReferenceBinding();
  const paths = binding.source.files.map(({ path }) => path);
  assert.equal(binding.schemaVersion, "current-q1-d7-input-binding-v1");
  assert.equal(binding.runtime.version, "v26.2.0");
  assert.deepEqual(Object.keys(binding.cases), ["conflictPreserving", "conflictFreePositive"]);
  assert.equal(binding.cases.conflictPreserving.corpusCaseId, "conflict-preserving-negative-v2");
  assert.equal(binding.cases.conflictFreePositive.corpusCaseId, "conflict-free-positive-v2");
  assert.deepEqual(paths, [...new Set(paths)].sort());
  assert.ok(paths.includes("apps/worker/src/server-pricing.ts"));
  assert.ok(paths.includes("apps/worker/scripts/s9-rehearsal-diagnostics.mjs"));
  assert.ok(paths.includes("apps/worker/scripts/gcp-fastpath-rehearsal.mjs"));
  assert.ok(paths.includes("apps/worker/postgres-test/fixtures/current-q1-d7-producer-component.check.mjs"));
  assert.ok(paths.includes("apps/worker/postgres-test/fixtures/current-q1-d7-diagnostic.mjs"));
  assert.ok(paths.includes("apps/worker/postgres-test/fixtures/current-q1-d7-diagnostic-guardian.mjs"));
  assert.ok(paths.includes("apps/worker/postgres-test/fixtures/current-q1-d7-diagnostic-child.mjs"));
  assert.ok(paths.includes("apps/worker/postgres-test/fixtures/current-q1-d7-diagnostic.check.mjs"));
});

function database() {
  return { prepare() { return { first: async () => 1, run: async () => ({ success: true }) }; } };
}

test("D7 Vite disables env-file loading with an actual synthetic Vite root", async () => {
  const root = await mkdtemp(join(tmpdir(), "current-q1-d7-vite-env-check-"));
  let server;
  try {
    await writeFile(join(root, ".env.local"), "VITE_D7_PRIVATE_FIXTURE_SENTINEL=must-not-load\n", { mode: 0o600 });
    const options = currentQ1D7ViteOptions({ root });
    assert.equal(options.configFile, false);
    assert.equal(options.envDir, false);
    server = await createServer(options);
    assert.equal(Object.hasOwn(server.config.env, "VITE_D7_PRIVATE_FIXTURE_SENTINEL"), false);
  } finally {
    await server?.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("D7 production entry has fixed owned contract imports, not an env-selected validator", async () => {
  const source = await readFile(FIXTURE, "utf8");
  assert.match(source, /import \* as Contract from "\.\/current-q1-d7-contract\.mjs";/u);
  assert.doesNotMatch(source, /CURRENT_Q1_D7_CONTRACT_PATH|process\.env/u);
  assert.match(source, /createServer\(currentQ1D7ViteOptions\(\{ cacheDir \}\)\)/u);
});

test("D1's default source capture keeps its pre-D7 path behavior", async () => {
  const source = await readFile(D1_FIXTURE, "utf8");
  const strictPathHelper = source.match(/const assertCanonicalPath = async \(path\) => \{([\s\S]*?)\n  \};/u)?.[1];
  assert.ok(strictPathHelper);
  assert.match(strictPathHelper, /requireFact\(await realpath\(path\) === path/u);
  assert.match(source, /if \(strictPublicPackageRoots\) await assertCanonicalPath\(absolute\)/u);
  assert.match(source, /validateSourcePath === undefined \|\| await realpath\(path\) === path/u);
  let canonicalPathCalls = 0;
  const validateSourcePath = undefined;
  const canonical = validateSourcePath === undefined || await (async () => {
    canonicalPathCalls++;
    return false;
  })();
  assert.equal(canonical, true);
  assert.equal(canonicalPathCalls, 0);
});

test("producer derives and validates the current public projection before accepting each case", async () => {
  const source = await readFile(FIXTURE, "utf8");
  assert.match(source, /currentPublicExpectations\[caseKey\]\s*=\s*buildCurrentQ1D7CurrentPublicExpectation/u);
  assert.match(source, /createCurrentQ1D7PublicProjectionReceipt\(/u);
  assert.match(source, /validateCurrentQ1D7CurrentPublicResponse\(/u);
  assert.match(source, /const publicAllowanceAuthority = ctx\.P\.reducePublicAllowanceBreakdownsV15/u);
  assert.match(source, /nativeByCase\[caseKey\]\.conflictProofs/u);
  assert.match(source, /publicationInventory/u);
  assert.match(source, /expectedDailyDays:\s*input\.corpus\.expectedDailyDays/u);
  assert.match(source, /expectation:\s*currentPublicExpectation/u);
});

test("the source-pinned current v1.5 reducer rejects every nonempty authority substitution", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "current-q1-d7-authority-vite-"));
  let server;
  try {
    server = await createServer(currentQ1D7ViteOptions({ cacheDir }));
    const P = await D1.loadCurrentQ1WorkerModules(server);
    assert.equal(typeof P.reducePublicAllowanceBreakdownsV15, "function");
    const envelope = { schemaVersion: "community-allowance-breakdowns-v1.5",
      basis: P.COMMUNITY_ALLOWANCE_BASIS, referencePlanType: "pro",
      normalization: P.COMMUNITY_ALLOWANCE_NORMALIZATION,
      modelBasis: P.ADMIN_COMMUNITY_ALLOWANCE_MODELS_BASIS,
      modelGate: P.ADMIN_COMMUNITY_ALLOWANCE_MODELS_GATE,
      generatedAt: new Date(Contract.CURRENT_Q1_D7_NOW_MS).toISOString(), days: [],
      modelConfig: P.buildCurrentPublicModelMetadata() };
    const authority = P.reducePublicAllowanceBreakdownsV15(envelope);
    assert.deepEqual(authority.base, Object.fromEntries(Object.entries(envelope).filter(([key]) => key !== "modelConfig")));
    assert.deepEqual(authority.metadata, envelope.modelConfig);
    for (const key of ["basis", "normalization", "modelBasis", "modelGate"]) {
      const substituted = structuredClone(envelope);
      substituted[key] = `${substituted[key]}-substituted`;
      assert.throws(() => P.reducePublicAllowanceBreakdownsV15(substituted),
        /PUBLIC_ALLOWANCE_BREAKDOWNS_V15_INVALID/u, `${key} must remain source-authoritative`);
    }
  } finally {
    await server?.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("expectation checks use the fixed same-module contract import", async () => {
  const source = await readFile(EXPECTATION_CHECK, "utf8");
  assert.match(source, /await import\("\.\/current-q1-d7-contract\.mjs"\)/u);
  assert.doesNotMatch(source, /CURRENT_Q1_D7_CONTRACT_PATH|process\.env/u);
});

test("compute clock and invocation deadline share monotonic performance time", async () => {
  const observed = [];
  const started = performance.now();
  const deadlineMonotonicMs = started + 10_000;
  await invokeCurrentQ1D7Compute({ bindings: { source: database(), target: database() },
    scope: { metric: "model", day: "2026-07-24" }, deadlineMonotonicMs,
    computeStorageGraphResult: async (bindings, _scope, options) => {
      const now = options.now();
      observed.push({ now, deadline: options.deadlineMs });
      await bindings.source.prepare("SELECT 1").first();
      await bindings.target.prepare("SELECT 1").first();
      return { state: "complete" };
    } });
  assert.equal(observed.length, 1);
  assert.ok(observed[0].now >= started && observed[0].now < started + 1_000);
  assert.ok(observed[0].deadline >= observed[0].now);
  assert.ok(observed[0].deadline <= observed[0].now + 20_000);
});

test("success cleanup can clear only a non-enumerable retained private oracle", () => {
  const ctx = {};
  Object.defineProperty(ctx, "privateValidatedOracle", { value: { digest: "private" },
    writable: true, enumerable: false, configurable: true });
  assert.equal(clearCurrentQ1D7PrivateValidatedOracle(ctx), true);
  assert.equal(Object.hasOwn(ctx, "privateValidatedOracle"), false);
});

test("D7 reuses the unchanged D1 checkpoint-progress selector and aggregate projection", async () => {
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const scope = { source: "effective", metric: "model", day: "2026-07-24",
    owner: { ownerDigest: hash("owner") }, checkpointDependencyDigest: hash("dependency") };
  const keyDigest = hash("key");
  const heads = [{ generation: hash("generation"), retired: 0 }];
  const stages = [{ n: 2, parts: 3, controlBytes: 20, manifestBytes: 40 }];
  const parts = [{ n: 3, bytes: 200 }];
  const prepared = [];
  const P = {
    STORAGE_GRAPH_EFFECTIVE_MODEL_CHECKPOINT_METHOD: "effective-model-method",
    STORAGE_GRAPH_LIVE_CHECKPOINT_METHODS: ["effective-model-method"],
    async storageHistoryKeyDigest(value) {
      assert.deepEqual(value, { sourceId: "gcp-fastpath-oracle", sourceNamespace: "gcp-fastpath-oracle",
        ownerDigest: scope.owner.ownerDigest, day: scope.day, dependencyDigest: scope.checkpointDependencyDigest,
        method: "effective-model-method" });
      return keyDigest;
    },
  };
  const analytics = {
    prepare(sql) {
      return { sql, bind(value) { const statement = { sql, value }; prepared.push(statement); return statement; } };
    },
    async batch(statements) {
      assert.equal(statements.length, 3);
      assert.deepEqual(statements, prepared);
      assert.ok(statements[0].sql.includes("analytics_history_checkpoint_heads"));
      assert.ok(statements[1].sql.includes("analytics_history_checkpoint_stages"));
      assert.ok(statements[2].sql.includes("analytics_history_checkpoint_parts"));
      assert.ok(statements.every((statement) => statement.value === keyDigest));
      return [{ results: heads }, { results: stages }, { results: parts }];
    },
  };
  const actual = await D1.nativeCheckpointProgress({ P, analytics }, scope);
  assert.equal(actual, hash(JSON.stringify({ keyDigest, heads, stages, parts })));
  const noCheckpoint = await D1.nativeCheckpointProgress({ P: {}, analytics: null },
    { source: "v0.2", metric: "model", day: "2026-07-24" });
  assert.equal(noCheckpoint, hash(JSON.stringify({ keyDigest: null })));
});
