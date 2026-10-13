// Unit checks for the GCP fast-path rehearsal's options and source-dump
// resolution. Synthetic files only; no database, no network, no refresh.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assertCurrentImageRuntime, assertCurrentRehearsalOutputsNew, currentRehearsalOutputDestinations, parseArguments, rehearsalComparisonGates, resolveRehearsalDump, runRehearsal, syntheticRehearsalFloorDays, verifyCurrentImageRuntimePath } from "./gcp-fastpath-rehearsal.mjs";

import { assertS9ChildCompleted, boundedS9ChildOutput, captureS9ChildCompletion, createS9Progress, observeS9ChildProgress, ownedKeptRehearsalSchemas, withS9OwnedSchemaCleanup,
  readS9ChildReport, validateS9ProgressJournal, S9_DIAGNOSTIC_BYTES, S9_REHEARSAL_DEADLINE_MS } from "./s9-rehearsal-diagnostics.mjs";

const refused = (code) => (error) => error?.code === code;

test("--dense holds the golden to its own per-date expectation and owner references", () => {
  const options = parseArguments(["--golden", "/g/golden-dense", "--dense", "--dump", "/d/usage-monitor-db.json"]);
  assert.equal(options.dense, true);
  assert.equal(options.perDateExpected, "/g/golden-dense/per-date-expected.json");
  assert.equal(options.ownerReference, "/g/golden-dense");
  assert.equal(options.dump, "/d/usage-monitor-db.json");
  assert.equal(options.refreshTimeoutMinutes, 30);
  for (const extra of [["--per-date-expected", "/x.json"], ["--owner-reference", "/x"]]) {
    assert.throws(() => parseArguments(["--golden", "/g", "--dense", ...extra]), refused("REHEARSAL_ARGUMENT_INVALID"));
  }
});

test("the Q-1 rehearsal takes optional per-date and owner references", () => {
  const options = parseArguments(["--golden", "/g/golden", "--per-date-expected", "/n/per-date-expected.json",
    "--owner-reference", "/n"]);
  assert.deepEqual([options.dense, options.perDateExpected, options.ownerReference, options.dump],
    [false, "/n/per-date-expected.json", "/n", null]);
});

test("K-CORE-A: staged primary migrations and compute Workers are opt-in and bounded", () => {
  const plain = parseArguments(["--golden", "/g/golden"]);
  assert.deepEqual([plain.stagedPrimary, plain.refreshWorkers], [[], 1]);
  const options = parseArguments(["--golden", "/g/golden", "--staged-primary", "0911_analytics_v2_run_stamps.sql",
    "--refresh-workers", "4"]);
  assert.deepEqual([options.stagedPrimary, options.refreshWorkers], [["0911_analytics_v2_run_stamps.sql"], 4]);
  for (const argv of [["--staged-primary", "../0911_x.sql"], ["--staged-primary", "kernel.sql"],
    ["--staged-primary", "0911_a.sql", "--staged-primary", "0911_a.sql"], ["--refresh-workers", "0"],
    ["--refresh-workers", "17"], ["--refresh-workers", "2.5"]]) {
    assert.throws(() => parseArguments(["--golden", "/g", ...argv]), refused("REHEARSAL_ARGUMENT_INVALID"), argv.join(" "));
  }
});

test("options are closed and bounded", () => {
  assert.throws(() => parseArguments([]), refused("REHEARSAL_GOLDEN_REQUIRED"));
  for (const argv of [["--golden"], ["--golden", "/g", "--dump"], ["--golden", "/g", "--dump", "--dense"],
    ["--golden", "/g", "--unknown"], ["--golden", "/g", "--refresh-timeout-minutes", "0"],
    ["--golden", "/g", "--refresh-timeout-minutes", "721"], ["--golden", "/g", "--refresh-timeout-minutes", "1.5"],
    ["--golden", "/g", "--reuse-schema", "public"],
    ["--golden", "/g", "--reuse-schema", "typed_legacy_transfer_rehearsal_target_fastpath_XYZ"]]) {
    assert.throws(() => parseArguments(argv), (error) => /^REHEARSAL_/u.test(error?.code ?? ""), argv.join(" "));
  }
  assert.equal(parseArguments(["--golden", "/g", "--refresh-timeout-minutes", "720"]).refreshTimeoutMinutes, 720);
  assert.equal(parseArguments(["--golden", "/g", "--reuse-schema",
    "typed_legacy_transfer_rehearsal_target_fastpath_0a1b2c3d"]).reuseSchema,
  "typed_legacy_transfer_rehearsal_target_fastpath_0a1b2c3d");
});

test("an external dump must match the digest the golden manifest pins", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gcp-fastpath-rehearsal-check-"));
  try {
    const golden = join(directory, "golden");
    await mkdir(golden);
    const dump = join(directory, "usage-monitor-db.json");
    const bytes = '{"schema":[],"tables":[]}\n';
    await writeFile(dump, bytes);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.deepEqual(await resolveRehearsalDump({ golden, dump, manifest: { sourceDump: { jsonSha256: sha256 } } }),
      { path: dump, sha256, pinned: true });
    await assert.rejects(resolveRehearsalDump({ golden, dump, manifest: { sourceDump: { jsonSha256: "0".repeat(64) } } }),
      refused("REHEARSAL_DUMP_DIGEST_MISMATCH"));
    await assert.rejects(resolveRehearsalDump({ golden, dump, manifest: {} }), refused("REHEARSAL_DUMP_UNPINNED"));
    await assert.rejects(resolveRehearsalDump({ golden, dump: null, manifest: {} }), refused("REHEARSAL_DUMP_MISSING"));
    // A committed dump is used as it is; giving another one as well is ambiguous.
    await mkdir(join(golden, "dump"));
    await writeFile(join(golden, "dump", "usage-monitor-db.json"), bytes);
    assert.deepEqual(await resolveRehearsalDump({ golden, dump: null, manifest: {} }),
      { path: join(golden, "dump", "usage-monitor-db.json"), sha256, pinned: false });
    await assert.rejects(resolveRehearsalDump({ golden, dump, manifest: { sourceDump: { jsonSha256: sha256 } } }),
      refused("REHEARSAL_DUMP_AMBIGUOUS"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("REV-SEED: the synthetic revision floor option is a fresh-schema rehearsal of a pure floor", () => {
  assert.equal(parseArguments(["--golden", "/g/golden"]).syntheticRevisionFloor, false);
  assert.equal(parseArguments(["--golden", "/g/golden", "--synthetic-revision-floor"]).syntheticRevisionFloor, true);
  assert.throws(() => parseArguments(["--golden", "/g", "--synthetic-revision-floor", "--reuse-schema",
    "typed_legacy_transfer_rehearsal_target_fastpath_0a1b2c3d"]), (error) => error?.code === "REHEARSAL_ARGUMENT_INVALID");
  const days = Array.from({ length: 15 }, (_, index) => ({ day: `2026-09-${String(index + 1).padStart(2, "0")}`, revision: 1 }));
  const floor = syntheticRehearsalFloorDays([...days].reverse());
  assert.equal(floor.length, 13, "each seventh day has no floor");
  assert.deepEqual(floor.slice(0, 7), [["2026-09-01", 1], ["2026-09-02", 2], ["2026-09-03", 3], ["2026-09-04", 4],
    ["2026-09-05", 5], ["2026-09-06", 1], ["2026-09-08", 3]]);
  assert.deepEqual(syntheticRehearsalFloorDays(days), floor, "a pure function of the golden");
});


test("MODEL-BLOCKS flags are bounded pure rehearsal pass-throughs", () => {
  const options = parseArguments(["--golden", "/g", "--refresh-model-block-size", "14", "--refresh-model-fanout", "all"]);
  assert.equal(options.refreshModelBlockSize, 14);
  assert.equal(options.refreshModelFanOut, "all");
  for (const flags of [["--refresh-model-block-size", "0"], ["--refresh-model-block-size", "71"],
    ["--refresh-model-block-size", "1.5"], ["--refresh-model-fanout", "sometimes"]]) {
    assert.throws(() => parseArguments(["--golden", "/g", ...flags]), refused("REHEARSAL_ARGUMENT_INVALID"));
  }
});


test("current Worker/D1 mode is explicit and has no saved-reference or injected producer path", () => {
  assert.equal(parseArguments(["--golden", "/g"]).comparisonMode, "historical");
  assert.equal(parseArguments(["--golden", "/g", "--comparison-mode", "current-worker-d1", "--out", "/new-report.json"]).comparisonMode,
    "current-worker-d1");
  const diagnostic = parseArguments(["--golden", "/g", "--comparison-mode", "current-worker-d1",
    "--per-date-expected", "/g/per-date.json", "--out", "/new-report.json"]);
  assert.equal(diagnostic.perDateExpected, "/g/per-date.json");
  for (const flags of [["--comparison-mode"], ["--comparison-mode", "unknown"],
    ["--comparison-mode", "historical", "--comparison-mode", "current-worker-d1"],
    ["--comparison-mode", "current-worker-d1", "--dense"],
    ["--comparison-mode", "current-worker-d1", "--owner-reference", "/old"],
    ["--comparison-mode", "current-worker-d1", "--current-reference", "/forged.json"],
    ["--comparison-mode", "current-worker-d1", "--current-reference-sha256", "a".repeat(64)],
    ["--comparison-mode", "current-worker-d1", "--producer", "/forged.mjs"]]) {
    assert.throws(() => parseArguments(["--golden", "/g", ...flags]), refused("REHEARSAL_ARGUMENT_INVALID"), flags.join(" "));
  }
});

test("current CLI and direct controller refuse schema reuse before resource access", async () => {
  const schema = "typed_legacy_transfer_rehearsal_target_fastpath_0a1b2c3d";
  for (const flags of [
    ["--comparison-mode", "current-worker-d1", "--reuse-schema", schema],
    ["--reuse-schema", schema, "--comparison-mode", "current-worker-d1"],
  ]) {
    assert.throws(() => parseArguments(["--golden", "/g", ...flags]),
      (error) => error?.code === "REHEARSAL_ARGUMENT_INVALID" && error.details?.argument === "--reuse-schema");
  }
  assert.equal(parseArguments(["--golden", "/g", "--reuse-schema", schema]).reuseSchema, schema,
    "historical reuse is preserved");
  for (const options of [
    { comparisonMode: "current-worker-d1", reuseSchema: schema },
    { reuseSchema: schema, comparisonMode: "current-worker-d1" },
  ]) {
    let accessed = false;
    for (const key of ["node22", "golden", "out", "stagedPrimary"]) Object.defineProperty(options, key, {
      get() { accessed = true; throw new Error("RESOURCE_ACCESS_BEFORE_REFUSAL"); },
    });
    await assert.rejects(runRehearsal(options),
      (error) => error?.code === "REHEARSAL_ARGUMENT_INVALID" && error.details?.argument === "--reuse-schema");
    assert.equal(accessed, false, "direct refusal precedes runtime/file/source binding and PG prerequisites");
  }
});

test("current output is explicit at CLI and direct entry before resource access", async () => {
  for (const flags of [["--comparison-mode", "current-worker-d1"],
    ["--comparison-mode", "current-worker-d1", "--out", "/"],
    ["--comparison-mode", "current-worker-d1", "--out", "/tmp/invalid\nreport"]]) {
    assert.throws(() => parseArguments(["--golden", "/g", ...flags]),
      (error) => error?.code === "REHEARSAL_ARGUMENT_INVALID" && error.details?.argument === "--out");
  }
  const explicit = parseArguments(["--golden", "/g", "--comparison-mode", "current-worker-d1",
    "--out", "./new-report.json"]);
  assert.equal(explicit.out, join(process.cwd(), "new-report.json"), "CLI resolves an explicit output normally");
  assert.equal(parseArguments(["--golden", "/g"]).out, null, "historical omitted output is preserved");
  for (const out of [null, undefined, "", "relative.json", "/", "/tmp/../tmp/report.json", "/tmp/report\0.json",
    "/tmp/report\r.json", "/tmp/report\n.json", {}, 5]) {
    let accessed = false;
    const options = { comparisonMode: "current-worker-d1", reuseSchema: null, out };
    for (const key of ["node22", "golden", "stagedPrimary"]) Object.defineProperty(options, key, {
      get() { accessed = true; throw new Error("RESOURCE_ACCESS_BEFORE_REFUSAL"); },
    });
    await assert.rejects(runRehearsal(options),
      (error) => error?.code === "REHEARSAL_ARGUMENT_INVALID" && error.details?.argument === "--out");
    assert.equal(accessed, false);
  }
});

test("current report and every original sidecar must be new before runtime access", async () => {
  const directory = await mkdtemp(join(tmpdir(), "current-rehearsal-no-clobber-"));
  try {
    const out = join(directory, "report.json");
    const destinations = currentRehearsalOutputDestinations(out);
    assert.equal(destinations.length, 4);
    assert.deepEqual(await assertCurrentRehearsalOutputsNew(out), destinations);
    for (const [index, path] of destinations.entries()) {
      const original = `retained-${index}`;
      await writeFile(path, original, { flag: "wx" });
      let accessed = false;
      const options = { comparisonMode: "current-worker-d1", reuseSchema: null, out };
      Object.defineProperty(options, "node22", { get() { accessed = true; throw new Error("RUNTIME_ACCESSED"); } });
      await assert.rejects(runRehearsal(options), (error) =>
        error?.code === "REHEARSAL_CURRENT_OUTPUT_EXISTS" && error.details?.destination === index);
      assert.equal(accessed, false);
      assert.equal(await readFile(path, "utf8"), original, "no original evidence is overwritten");
      await rm(path);
    }
    await mkdir(destinations[2]);
    await assert.rejects(assertCurrentRehearsalOutputsNew(out), refused("REHEARSAL_CURRENT_OUTPUT_EXISTS"));
    await rm(destinations[2], { recursive: true });
    await symlink(join(directory, "absent-target"), destinations[3]);
    await assert.rejects(assertCurrentRehearsalOutputsNew(out), refused("REHEARSAL_CURRENT_OUTPUT_EXISTS"));
    await rm(destinations[3]);
    await assert.rejects(assertCurrentRehearsalOutputsNew(join(directory, "absent-parent", "report.json")),
      refused("REHEARSAL_CURRENT_OUTPUT_UNAVAILABLE"));
    // A destination appearing after preflight is still protected by the actual
    // controller's wx writes, not by the earlier absence check alone.
    await writeFile(out, "late-retained", { flag: "wx" });
    await assert.rejects(writeFile(out, "replacement", { flag: "wx", mode: 0o600 }), (error) => error?.code === "EEXIST");
    assert.equal(await readFile(out, "utf8"), "late-retained");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("current image runtime enforces exact version and verified platform binary pins", () => {
  const mac = { version: "v22.16.0", platform: "darwin", arch: "arm64",
    binarySha256: "a45751fbfe88440bebff63cd44814e4ed6deb642bc3e3c4a14c4f8ae0ed9e019" };
  const linux = { version: "v22.16.0", platform: "linux", arch: "x64",
    binarySha256: "8142d37c6f2f372ef040419e7a111a6baf17df89f8078d02447d6c639ae20c1d" };
  for (const identity of [mac, linux]) assert.doesNotThrow(() => assertCurrentImageRuntime(identity));
  for (const identity of [{ ...mac, version: "v22.17.0" }, { ...mac, version: "v26.2.0" },
    { ...mac, binarySha256: "0".repeat(64) }, { ...mac, binarySha256: linux.binarySha256 },
    { ...mac, platform: "linux", arch: "arm64" }, { ...linux, platform: "win32" }]) {
    assert.throws(() => assertCurrentImageRuntime(identity), refused("REHEARSAL_CURRENT_IMAGE_RUNTIME_INVALID"));
  }
});

test("wrong, relative and symlink current image paths refuse before executable or source access", async () => {
  const directory = await mkdtemp(join(tmpdir(), "current-image-pin-negative-"));
  try {
    const fake = join(directory, "fake-node");
    await writeFile(fake, "synthetic untrusted binary", { flag: "wx" });
    const linked = join(directory, "linked-node"); await symlink(fake, linked);
    for (const node22 of [fake, linked, directory, "relative-node", join(directory, "absent-node")]) {
      let accessed = false;
      const options = { comparisonMode: "current-worker-d1", reuseSchema: null,
        out: join(directory, "report.json"), node22 };
      for (const key of ["golden", "stagedPrimary"]) Object.defineProperty(options, key, {
        get() { accessed = true; throw new Error("SOURCE_ACCESS_BEFORE_REFUSAL"); },
      });
      await assert.rejects(runRehearsal(options), refused("REHEARSAL_CURRENT_IMAGE_RUNTIME_INVALID"));
      assert.equal(accessed, false);
    }
    await assert.rejects(verifyCurrentImageRuntimePath(fake), refused("REHEARSAL_CURRENT_IMAGE_RUNTIME_INVALID"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("current gates cannot promote saved comparison-only evidence without the actual controller receipt", () => {
  // This tests the pure gate selector, not execution or receipt authenticity.
  const comparison = { schemaVersion: "analytics-v2-current-contract-report-v1", comparisonMode: "current-worker-d1",
    referenceBound: true, referenceComplete: true, equal: true, unexpectedDiffs: 0,
    evidenceScope: "reference-comparison-only", establishesNativeExecution: false };
  const arguments_ = { comparisonMode: "current-worker-d1", currentContractParity: comparison,
    parity: { schemaVersion: "analytics-v2-parity-report-v4", unexpectedDiffs: 9, breakdownsV13: { accepted: false },
      days: { golden: 168, actual: 168, missingInActual: [], extraInActual: [] },
      families: ["daily-days", "daily-totals", "daily-cells", "daily-other"].map((family) => ({ family,
        expected: false, compared: family === "daily-days" ? 1 : 168, equal: family === "daily-days" ? 1 : 168, diffCount: 0 })) },
    hasAllowanceBreakdowns: true,
    perDate: { equal: false } };
  assert.deepEqual(rehearsalComparisonGates(arguments_), { currentWorkerD1ProducerAccepted: false,
    currentWorkerD1ReferenceComplete: false, currentWorkerD1Equality: false, immutableCorpusDailyConserved: true });
  const producerAcceptance = { schemaVersion: "current-q1-d1-producer-acceptance-v1", accepted: true,
    actualHelperInvocation: true, resultReturnedAfterOwnedCleanup: true, cryptographicExecutionAttestation: false };
  assert.deepEqual(rehearsalComparisonGates({ ...arguments_, producerAcceptance }), { currentWorkerD1ProducerAccepted: true,
    currentWorkerD1ReferenceComplete: true, currentWorkerD1Equality: true, immutableCorpusDailyConserved: true });
  for (const [field, value] of [["schemaVersion", "unknown"], ["accepted", false], ["actualHelperInvocation", false],
    ["resultReturnedAfterOwnedCleanup", false], ["cryptographicExecutionAttestation", true]]) {
    const gates = rehearsalComparisonGates({ ...arguments_, producerAcceptance: { ...producerAcceptance, [field]: value } });
    for (const name of ["currentWorkerD1ProducerAccepted", "currentWorkerD1ReferenceComplete", "currentWorkerD1Equality"]) {
      assert.equal(gates[name], false);
    }
    assert.equal(gates.immutableCorpusDailyConserved, true, "corpus conservation is independent of producer acceptance");
  }
  for (const [field, value] of [["schemaVersion", "analytics-v2-parity-report-v4"], ["comparisonMode", "historical"],
    ["referenceBound", false], ["referenceComplete", false], ["equal", false], ["unexpectedDiffs", 1]]) {
    const gates = rehearsalComparisonGates({ ...arguments_, producerAcceptance,
      currentContractParity: { ...comparison, [field]: value } });
    assert.equal(gates.currentWorkerD1Equality, false);
  }
  for (const mutate of [
    (parity) => { delete parity.families; },
    (parity) => { parity.families.pop(); },
    (parity) => { parity.families.push(structuredClone(parity.families[0])); },
    (parity) => { parity.families[1].diffCount = 1; },
    (parity) => { parity.families[1].compared = 0; parity.families[1].equal = 0; },
    (parity) => { parity.families[1].expected = true; },
    (parity) => { parity.days.actual -= 1; },
    (parity) => { parity.days.missingInActual.push("2026-09-01"); },
    (parity) => { parity.schemaVersion = "unknown"; },
  ]) {
    const parity = structuredClone(arguments_.parity); mutate(parity);
    const gates = rehearsalComparisonGates({ ...arguments_, parity, producerAcceptance });
    assert.equal(gates.currentWorkerD1Equality, true, "equal current outputs do not substitute for conservation");
    assert.equal(gates.immutableCorpusDailyConserved, false);
  }
  assert.deepEqual(rehearsalComparisonGates({ ...arguments_, comparisonMode: "historical" }), {
    parityZeroUnexpected: false, breakdownsV13Declared: false, perDateEqual: false });
});

test("qualifying driver invokes the fixed actual D1 producer and preserves original acceptance before any PG query", async () => {
  // Source-control-flow regression guard; actual D1 execution remains a separate gate.
  const source = await readFile(new URL("./gcp-fastpath-rehearsal.mjs", import.meta.url), "utf8");
  assert.match(source, /await import\("\.\.\/postgres-test\/fixtures\/current-q1-d1-reference\.mjs"\)/u);
  const positions = [
    'currentReferenceBinding = await timed(timings, "current-d1:input-binding", captureCurrentQ1ReferenceBinding)',
    'currentReference = await timed(timings, "current-d1:replay", runCurrentQ1D1Reference)',
    'validateCurrentQ1ReferenceBinding({ reference: currentReference, expected: currentReferenceBinding })',
    'currentReferenceSha256 = createHash("sha256").update(JSON.stringify(currentReference))',
    'writeFile(`${options.out}.current-reference-acceptance.json`',
    'const version = await pool.query("SELECT current_setting',
  ].map((statement) => source.indexOf(statement));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  const entry = source.slice(source.indexOf("export async function runRehearsal(options)"));
  assert.ok(entry.indexOf("currentRehearsalOutputDestinations(options.out)") < entry.indexOf("existsSync(options.node22)"));
  assert.ok(entry.indexOf("await assertCurrentRehearsalOutputsNew(options.out)") < entry.indexOf("existsSync(options.node22)"));
  const currentBranch = entry.slice(entry.indexOf('const retained = await verifyCurrentImageRuntimePath(options.node22)'));
  assert.ok(currentBranch.indexOf('const retained = await verifyCurrentImageRuntimePath(options.node22)')
    < currentBranch.indexOf('execFileAsync(options.node22, ["--version"])'), "pin check precedes execution");
  assert.ok(currentBranch.indexOf('await verifyCurrentImageRuntimePath(options.node22)')
    < currentBranch.indexOf('await readFile(join(options.golden'), "trusted runtime precedes source access");
  assert.match(entry, /await writeFile\(options\.out, text, \{ flag: "wx", mode: 0o600 \}\);\s*process\.stdout\.write\(text\)/u,
    "current report is wx-preserved before any qualifying stdout report");
  assert.match(source, /referenceSha256: currentReferenceSha256, actual, actualPreview/u,
    "comparison consumes the original producer digest, not a reminted PG or saved-file digest");
});

// S9 failure diagnostics use synthetic child results, with no subprocess, database or network.
test("S9 preserves success and closes failed child results without exposing raw error fields", async () => {
  assert.equal(S9_REHEARSAL_DEADLINE_MS, 2_400_000, "the original 40-minute child budget is retained");
  const success = await captureS9ChildCompletion(async () => ({ stdout: "synthetic", stderr: "" }), () => 1);
  assert.deepEqual(success.metadata, { state: "completed", exitCode: 0, signal: null, killed: false,
    childCode: null, deadlineMs: S9_REHEARSAL_DEADLINE_MS, deadlineElapsed: false });
  assert.doesNotThrow(() => assertS9ChildCompleted(success.metadata));
  assert.equal(success.stdout.bytes.toString(), "synthetic");
  for (const input of [
    { code: 2, signal: null, killed: false },
    { code: null, signal: "SIGTERM", killed: true },
    { code: "ENOENT", signal: null, killed: false },
    { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", signal: null, killed: true },
    { code: "PRIVATE_TOKEN", signal: "PRIVATE_PATH", killed: "yes" },
  ]) {
    let time = 0;
    const completion = await captureS9ChildCompletion(async () => {
      time = S9_REHEARSAL_DEADLINE_MS;
      throw { ...input, message: "PRIVATE_MESSAGE", path: "/private/synthetic", cmd: "PRIVATE_COMMAND",
        stdout: "synthetic stdout", stderr: "synthetic stderr" };
    }, () => time);
    assert.equal(completion.metadata.state, "failed");
    assert.equal(completion.metadata.deadlineElapsed, true);
    assert.equal(completion.metadata.killed, input.killed === true);
    assert.equal(completion.metadata.exitCode, input.code === 2 ? 2 : null);
    assert.equal(completion.metadata.signal, input.signal === "SIGTERM" ? "SIGTERM" : null);
    assert.equal(completion.metadata.childCode, ["ENOENT", "ERR_CHILD_PROCESS_STDIO_MAXBUFFER"].includes(input.code)
      ? input.code : "other");
    assert.doesNotMatch(JSON.stringify(completion.metadata), /PRIVATE_|private\/synthetic/u);
    assert.throws(() => assertS9ChildCompleted(completion.metadata), (error) =>
      error.code === "S9_REHEARSAL_CHILD_FAILED" && error.message === error.code
        && error.diagnostic === completion.metadata);
  }
});

test("S9 keeps a valid failed report available for exact schema cleanup and refuses missing or malformed reports closed", async () => {
  const failed = (await captureS9ChildCompletion(async () => { throw { code: 2 }; })).metadata;
  const valid = { status: "error", reusedSchema: false,
    schema: "typed_legacy_transfer_rehearsal_target_fastpath_0123abcd",
    keptSchemas: ["typed_legacy_transfer_rehearsal_target_fastpath_0123abcd",
      "typed_legacy_transfer_rehearsal_ctl_0123abcd"] };
  assert.deepEqual(await readS9ChildReport("synthetic", failed, async () => JSON.stringify(valid)), valid,
    "a child failure does not bypass the caller's owned-schema boundary");
  for (const read of [async () => { throw { code: "ENOENT", message: "PRIVATE" }; },
    async () => "bad JSON PRIVATE", async () => "[]", async () => "null"]) {
    await assert.rejects(readS9ChildReport("synthetic", failed, read), (error) =>
      error.code === "S9_REHEARSAL_CHILD_FAILED" && error.message === error.code);
    await assert.rejects(readS9ChildReport("synthetic", { state: "completed" }, read),
      (error) => error.code === "S9_REHEARSAL_REPORT_INVALID" && error.message === error.code);
  }
  const edge = await readFile(new URL("../postgres-test/edge-origin-e2e.spec.mjs", import.meta.url), "utf8");
  const entry = edge.slice(edge.indexOf('test("S9 golden:'));
  assert.ok(entry.indexOf("await withS9OwnedSchemaCleanup(rehearsal,")
    < entry.indexOf("assertS9ChildCompleted(seeded.childCompletion)"));
  assert.match(entry, /async \(kept\) => \{[\s\S]*?for \(const name of \[\.\.\.kept\]\.reverse\(\)\)/u);
  assert.doesNotMatch(edge.slice(edge.indexOf("async function seededRehearsal()"), edge.indexOf('test("S9 golden:')),
    /catch\(\(\) => undefined\)/u);
});

test("S9 private output preserves a bounded exact tail and its truncation fact", () => {
  const bytes = Buffer.alloc(S9_DIAGNOSTIC_BYTES + 17, 120); bytes[bytes.length - 1] = 121;
  const result = boundedS9ChildOutput(bytes);
  assert.equal(result.originalBytes, bytes.length);
  assert.equal(result.truncated, true);
  assert.deepEqual(result.bytes, bytes.subarray(17));
  assert.equal(result.bytes.length, S9_DIAGNOSTIC_BYTES);
  assert.deepEqual(boundedS9ChildOutput({ secret: "PRIVATE" }), { bytes: Buffer.alloc(0), originalBytes: 0, truncated: false });
});

test("S9 progress uses fixed stages, a monotonic clock, bounded numeric counters and a finite heartbeat", () => {
  let time = 0, tick, interval, cancelled = 0;
  const output = [];
  const progress = createS9Progress("producer", { now: () => time, emit: (line) => output.push(JSON.parse(line)),
    schedule: (callback, ms) => { tick = callback; interval = ms; return 7; },
    cancel: (timer) => { assert.equal(timer, 7); cancelled++; } });
  assert.equal(interval, 5_000);
  tick(); assert.equal(output.length, 0);
  progress.phase("admission");
  progress.counts({ ownerOrdinal: 2, completedChunks: 3, iteration: 10_000_001,
    completedDays: -1, scopeOrdinal: NaN, dayOrdinal: 1.5, phase: "PRIVATE", path: "/private/synthetic" });
  time = 5_000; tick();
  assert.deepEqual(output.at(-1), { event: "s9_rehearsal_progress", component: "producer", phase: "admission",
    elapsedMs: 5_000, ownerOrdinal: 2, completedChunks: 3 });
  assert.throws(() => progress.phase("PRIVATE"), /S9_PROGRESS_PHASE_INVALID/u);
  progress.phase("native_probes");
  assert.deepEqual(Object.keys(output.at(-1)), ["event", "component", "phase", "elapsedMs"]);
  time = 100_000_000; tick(); assert.equal(output.at(-1).elapsedMs, 86_400_000);
  for (let n = 0; n < 2_000; n++) tick();
  assert.equal(output.length, 1_024);
  assert.doesNotMatch(JSON.stringify(output), /PRIVATE|private\/synthetic/u);
  progress.close(); progress.close(); tick();
  assert.equal(cancelled, 1); assert.equal(output.length, 1_024);
  assert.throws(() => createS9Progress("PRIVATE"), /S9_PROGRESS_COMPONENT_INVALID/u);
  const broken = createS9Progress("controller", { emit: () => { throw new Error("sink unavailable"); },
    schedule: () => 8, cancel: () => {} });
  assert.doesNotThrow(() => broken.phase("current_d1_replay")); broken.close();
});


test("S9 executes exact owned-schema cleanup before a sanitized failed-child rejection", async () => {
  const report = { reusedSchema: false, schema: "typed_legacy_transfer_rehearsal_target_fastpath_0123abcd",
    keptSchemas: ["typed_legacy_transfer_rehearsal_target_fastpath_0123abcd", "typed_legacy_transfer_rehearsal_ctl_0123abcd"] };
  const completion = (await captureS9ChildCompletion(async () => { throw { code: 2, message: "PRIVATE" }; })).metadata;
  const events = [];
  await assert.rejects(withS9OwnedSchemaCleanup(report, async (kept) => {
    events.push("entered"); assert.deepEqual(kept, report.keptSchemas); assertS9ChildCompleted(completion);
  }, async (kept) => {
    for (const name of [...kept].reverse()) events.push(name);
  }), (error) => { events.push("rejected"); return error.code === "S9_REHEARSAL_CHILD_FAILED"; });
  assert.deepEqual(events, ["entered", ...report.keptSchemas.toReversed(), "rejected"]);
  for (const invalid of [{}, { ...report, reusedSchema: true }, { ...report, schema: "private_schema" },
    { ...report, keptSchemas: ["private_schema"] }, { ...report, keptSchemas: [...report.keptSchemas, report.schema] },
    { ...report, keptSchemas: [report.schema, report.schema] }, { ...report, keptSchemas: null }]) {
    let touched = false;
    await assert.rejects(withS9OwnedSchemaCleanup(invalid, async () => { touched = true; }, async () => { touched = true; }));
    assert.equal(touched, false, "unknown ownership cannot enter a work or cleanup callback");
  }
  const success = (await captureS9ChildCompletion(async () => ({ stdout: "", stderr: "" }))).metadata;
  assert.equal(await withS9OwnedSchemaCleanup(report, async () => {
    assertS9ChildCompleted(success); return "same result";
  }, async () => events.push("successful cleanup")), "same result");
  assert.equal(events.at(-1), "successful cleanup");
  assert.deepEqual(ownedKeptRehearsalSchemas({ ...report, keptSchemas: [] }), [], "pre-PG errors own no schema");
});

test("S9 live progress preserves split records and heartbeats before child completion and closes exactly", async () => {
  const stderr = new EventEmitter(), lines = [], buffered = [];
  stderr.on("data", (chunk) => buffered.push(chunk));
  const observer = observeS9ChildProgress({ stderr }, async (line) => lines.push(line));
  const value = { event: "s9_rehearsal_progress", component: "producer", phase: "settle_cache", elapsedMs: 5_000, iteration: 3 };
  const line = `${JSON.stringify(value)}\n`;
  stderr.emit("data", Buffer.from(line.slice(0, 17)));
  stderr.emit("data", Buffer.from(line.slice(17, 41)));
  stderr.emit("data", Buffer.from(line.slice(41)));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(lines.map((text) => JSON.parse(text)), [value], "the child has not exited, yet phase evidence is retained");
  stderr.emit("data", line);
  const first = await observer.close(), second = await observer.close();
  assert.equal(first.records, 2); assert.equal(first.rejected, 0); assert.equal(first.preserved, true);
  assert.equal(first.bytes, lines.reduce((sum, text) => sum + Buffer.byteLength(text), 0));
  assert.deepEqual(second, first);
  stderr.emit("data", line); assert.equal(lines.length, 2);
  assert.equal(buffered.length, 5, "the observer does not consume or alter execFile's own stream");
  assert.equal(stderr.listenerCount("data"), 1, "only the diagnostic observer is detached");
});

test("S9 live progress rejects raw, private, malformed, oversized and out-of-contract values", async () => {
  const stderr = new EventEmitter(), lines = [];
  const observer = observeS9ChildProgress({ stderr }, async (line) => lines.push(line));
  const good = { event: "s9_rehearsal_progress", component: "controller", phase: "current_d1_replay", elapsedMs: 0 };
  for (const value of [{ ...good, privatePath: "/private/SENSITIVE_CANARY" }, { ...good, phase: "SENSITIVE_CANARY" },
    { ...good, component: "SENSITIVE_CANARY" }, { ...good, component: { toString: "SENSITIVE_CANARY" } },
    { ...good, elapsedMs: -1 }, { ...good, elapsedMs: 86_400_001 }, { ...good, elapsedMs: 1.5 },
    { ...good, iteration: "SENSITIVE_CANARY" }, { ...good, iteration: -1 }, { ...good, iteration: 10_000_001 },
    { ...good, iteration: 1.5 }, { ...good, event: "SENSITIVE_CANARY" }, [], null, {}]) {
    assert.doesNotThrow(() => stderr.emit("data", `${JSON.stringify(value)}\n`));
  }
  stderr.emit("data", "raw stderr /private/SENSITIVE_CANARY\nmalformed SENSITIVE_CANARY\n");
  stderr.emit("data", "SENSITIVE_CANARY".repeat(100)); stderr.emit("data", "discarded remainder\n");
  stderr.emit("data", Buffer.alloc(64 * 1024 + 1, 120)); stderr.emit("data", "\n");
  stderr.emit("data", `${JSON.stringify(good)}\n`);
  stderr.emit("data", '{"event":"SENSITIVE_CANARY"');
  const result = await observer.close();
  assert.equal(result.records, 1); assert.equal(result.preserved, true); assert.ok(result.rejected >= 19);
  assert.deepEqual(lines.map((line) => JSON.parse(line)), [good]);
  assert.doesNotMatch(lines.join(""), /SENSITIVE_CANARY|private/u);
  assert.throws(() => observeS9ChildProgress({}, async () => {}), /S9_PROGRESS_STREAM_INVALID/u);
});

test("S9 live progress file and record caps remain finite and write failures are explicit", async () => {
  for (const large of [false, true]) {
    const stderr = new EventEmitter(), lines = [];
    const observer = observeS9ChildProgress({ stderr }, async (line) => lines.push(line));
    const value = { event: "s9_rehearsal_progress", component: "producer", phase: "admission", elapsedMs: 0,
      ...(large ? Object.fromEntries(["iteration", "completedSteps", "scopeOrdinal", "ownerOrdinal", "dayOrdinal",
        "chunkOrdinal", "completedOwners", "completedDays", "completedChunks"].map((key) => [key, 10_000_000])) : {}) };
    for (let n = 0; n < 2_000; n++) stderr.emit("data", `${JSON.stringify(value)}\n`);
    const result = await observer.close();
    assert.ok(result.records <= 1_024 && result.bytes <= S9_DIAGNOSTIC_BYTES);
    assert.ok(result.rejected > 0); assert.equal(result.preserved, true);
    assert.equal(lines.length, result.records);
    assert.equal(result.bytes, lines.reduce((sum, line) => sum + Buffer.byteLength(line), 0));
    if (!large) assert.equal(result.records, 1_024); else assert.ok(result.records < 1_024, "byte cap is exercised independently");
  }
  const stderr = new EventEmitter(); let writes = 0;
  const observer = observeS9ChildProgress({ stderr }, async () => { writes++; throw new Error("PRIVATE_WRITE_FAILURE"); });
  const line = `${JSON.stringify({ event: "s9_rehearsal_progress", component: "producer", phase: "oracle", elapsedMs: 0 })}\n`;
  stderr.emit("data", line); stderr.emit("data", line);
  const result = await observer.close(); assert.equal(result.preserved, false); assert.equal(writes, 1);
  assert.equal(result.records, 0); assert.equal(result.bytes, 0); assert.equal(result.rejected, 2);
  const partial = new EventEmitter(), retained = []; let attempts = 0;
  const prefix = observeS9ChildProgress({ stderr: partial }, async (text) => {
    if (++attempts === 2) throw new Error("PRIVATE_WRITE_FAILURE"); retained.push(text);
  });
  partial.emit("data", line); partial.emit("data", line); partial.emit("data", line);
  const prefixResult = await prefix.close();
  assert.equal(prefixResult.preserved, false); assert.equal(attempts, 2);
  assert.equal(prefixResult.records, retained.length); assert.equal(prefixResult.records, 1);
  assert.equal(prefixResult.bytes, Buffer.byteLength(retained.join(""))); assert.equal(prefixResult.rejected, 2);
});


test("S9 live progress enforces monotonic clocks separately for interleaved components", async () => {
  const stderr = new EventEmitter(), lines = [];
  const observer = observeS9ChildProgress({ stderr }, async (line) => lines.push(JSON.parse(line)));
  const send = (component, elapsedMs) => stderr.emit("data", `${JSON.stringify({ event: "s9_rehearsal_progress",
    component, phase: component === "producer" ? "oracle" : "current_d1_replay", elapsedMs })}\n`);
  send("controller", 5_000); send("producer", 0); send("producer", 5_000);
  send("producer", 0); send("controller", 1_000); send("controller", 5_000); send("producer", 5_001);
  const result = await observer.close();
  assert.equal(result.records, 5); assert.equal(result.rejected, 2); assert.equal(result.preserved, true);
  assert.deepEqual(lines.map(({ component, elapsedMs }) => [component, elapsedMs]),
    [["controller", 5_000], ["producer", 0], ["producer", 5_000], ["controller", 5_000], ["producer", 5_001]]);
});


test("S9 successful cleanup preserves only a bounded exact closed progress journal", async () => {
  const values = [{ event: "s9_rehearsal_progress", component: "producer", phase: "oracle", elapsedMs: 5_000 },
    { event: "s9_rehearsal_progress", component: "controller", phase: "current_d1_replay", elapsedMs: 0 }];
  const bytes = Buffer.from(values.map((value) => `${JSON.stringify(value)}\n`).join(""));
  const receipt = { records: 2, bytes: bytes.length, preserved: true };
  assert.deepEqual(validateS9ProgressJournal(bytes, receipt), values);
  assert.deepEqual(validateS9ProgressJournal(Buffer.alloc(0), { records: 0, bytes: 0, preserved: true }), []);
  for (const changed of [{ ...receipt, preserved: false }, { ...receipt, records: 1 },
    { ...receipt, records: 1_025 }, { ...receipt, bytes: bytes.length + 1 }]) {
    assert.throws(() => validateS9ProgressJournal(bytes, changed));
  }
  for (const content of ["raw SENSITIVE_CANARY\n", '{"privatePath":"SENSITIVE_CANARY"}\n',
    JSON.stringify(values[0]), `${JSON.stringify(values[0])}\n${JSON.stringify({ ...values[0], elapsedMs: 0 })}\n`,
    `${JSON.stringify({ ...values[0], iteration: 10_000_001 })}\n`, "x".repeat(1_025) + "\n"]) {
    const input = Buffer.from(content), records = content.endsWith("\n") ? content.split("\n").length - 1 : 1;
    assert.throws(() => validateS9ProgressJournal(input, { records, bytes: input.length, preserved: true }));
  }
  assert.throws(() => validateS9ProgressJournal(Buffer.alloc(S9_DIAGNOSTIC_BYTES + 1),
    { records: 0, bytes: S9_DIAGNOSTIC_BYTES + 1, preserved: true }));
  const edge = await readFile(new URL("../postgres-test/edge-origin-e2e.spec.mjs", import.meta.url), "utf8");
  const body = edge.slice(edge.indexOf("async function seededRehearsal()"), edge.indexOf('test("S9 golden:'));
  const completion = body.indexOf('await preserve("s9-child-completion"');
  const progress = body.indexOf('await preserve("s9-progress"');
  const discard = body.indexOf('discardDirectory = completion.metadata.state === "completed" && artifactsPreserved');
  const remove = body.indexOf('await rm(directory,');
  assert.ok(completion >= 0 && progress > completion && discard > progress && remove > discard,
    "successful directory deletion occurs only after requested wx diagnostic sidecars are preserved");
});
