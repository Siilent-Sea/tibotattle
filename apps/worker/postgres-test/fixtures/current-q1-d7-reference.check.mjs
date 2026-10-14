import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { captureCurrentQ1SourceSnapshot, readCurrentQ1ResponseSnapshot } from "./current-q1-d1-reference.mjs";
import { captureCurrentQ1SourceInvariant, captureCurrentQ1SourceInvariantDetails }
  from "./current-q1-d1-recompute.mjs";
import { assertCurrentQ1D7BootstrapTransition } from "./current-q1-d7-recompute.mjs";

const day1 = "2026-04-15", day2 = "2026-04-16", day3 = "2026-04-17", unrelated = "2025-01-01";
const schema = "schema";
const invariants = (changed = false) => ({ schemaSha256: schema, sha256: changed ? "after" : "before",
  controls: [{ singleton_id: 1, revision: 0 }], audit: [],
  tables: [
    { table: "accountless_upload_owners", rows: 1, sha256: "stable" },
    { table: "community_public_source_bootstrap", rows: 1, sha256: changed ? "boot-after" : "boot-before" },
    { table: "community_daily_aggregate_rebuilds", rows: changed ? 4 : 1, sha256: changed ? "daily-after" : "daily-before" },
    { table: "community_current_analysis_queue", rows: changed ? 2 : 1, sha256: changed ? "queue-after" : "queue-before" },
  ], sequences: [{ name: "community_current_analysis_queue", seq: changed ? 2 : 1 },
    { name: "other", seq: 7 }] });
const before = {
  bootstrap: { singleton: 1, policy_version: "community-public-sources-v1", participant_cursor: "", source_day_cursor: "", completed: 0 },
  mutation: { singleton_id: 1, mutation_epoch: 5 },
  dailyRebuilds: [{ day: unrelated, requested_epoch: 3, requested_at: "2026-01-01T00:00:00.000Z" }],
  queueState: { singleton_id: 1, window_generation: 4 },
  queue: [{ id: 1, participant_id: "p1", dirty_generation: 2, window_generation: 4, pending: 0,
    last_served_sequence: 3, completed_day: day1, completed_method: "method" }],
  domainDays: [{ participant_id: "p1", generation_id: 8, day: day1 },
    { participant_id: "p1", generation_id: 8, day: day2 }, { participant_id: "p2", generation_id: 9, day: day3 }],
  sequences: [{ name: "community_current_analysis_queue", seq: 1 }, { name: "other", seq: 7 }],
};
const after = {
  bootstrap: { ...before.bootstrap, participant_cursor: "p2", source_day_cursor: day3, completed: 1 },
  mutation: before.mutation,
  dailyRebuilds: [before.dailyRebuilds[0],
    ...[day1, day2, day3].map((day) => ({ day, requested_epoch: 5, requested_at: "2026-10-01T00:00:00.000Z" }))],
  queueState: before.queueState,
  queue: [{ ...before.queue[0], pending: 1 }, { id: 2, participant_id: "p2", dirty_generation: 1,
    window_generation: 4, pending: 1, last_served_sequence: 0, completed_day: null, completed_method: null }],
  domainDays: before.domainDays,
  sequences: [{ name: "community_current_analysis_queue", seq: 2 }, { name: "other", seq: 7 }],
};

const proof = assertCurrentQ1D7BootstrapTransition({ beforeInvariant: invariants(), afterInvariant: invariants(true),
  before, after, bootstrapSteps: 2 });
assert.deepEqual(proof, { beforeSha256: proof.beforeSha256, afterSha256: proof.afterSha256, bootstrapSteps: 2,
  domainDayCount: 3, affectedDayCount: 3, queuedParticipantCount: 2, insertedQueueCount: 1, queueSequenceDelta: 1 });

const expectRejected = (mutate) => {
  const candidate = structuredClone(after); mutate(candidate);
  assert.throws(() => assertCurrentQ1D7BootstrapTransition({ beforeInvariant: invariants(),
    afterInvariant: invariants(true), before, after: candidate, bootstrapSteps: 2 }));
};
expectRejected((candidate) => { candidate.queue[0].dirty_generation++; });
expectRejected((candidate) => { candidate.dailyRebuilds[0].requested_epoch++; });
expectRejected((candidate) => { candidate.bootstrap.source_day_cursor = day1; });
expectRejected((candidate) => { candidate.mutation.mutation_epoch++; });
expectRejected((candidate) => { candidate.sequences[1].seq++; });
expectRejected((candidate) => { candidate.sequences[0].seq = 4; });
expectRejected((candidate) => { candidate.dailyRebuilds.push({ day: "2026-01-01", requested_epoch: 5,
  requested_at: "2026-10-01T00:00:00.000Z" }); });
expectRejected((candidate) => { candidate.queue.push({ id: 3, participant_id: "unselected", dirty_generation: 1,
  window_generation: 4, pending: 1, last_served_sequence: 0, completed_day: null, completed_method: null }); });
assert.throws(() => assertCurrentQ1D7BootstrapTransition({ beforeInvariant: invariants(),
  afterInvariant: { ...invariants(true), schemaSha256: "changed" }, before, after, bootstrapSteps: 2 }));
await assert.rejects(() => captureCurrentQ1SourceSnapshot([], {}),
  (error) => error?.code === "CURRENT_Q1_INPUT_INVALID");
await assert.rejects(() => captureCurrentQ1SourceSnapshot([], { validateSourcePath: () => true }),
  (error) => error?.code === "CURRENT_Q1_INPUT_INVALID");

// The reusable D1 read seam returns the exact current DTO pair only; it does
// not invoke D1 readiness rewriting or inject D7-specific output fields.
const publicBody = { schemaVersion: "public-community-daily-v1", days: [] };
const adminPreview = { sourceId: "gcp-fastpath-oracle", days: [] };
const readCalls = [];
const snapshot = await readCurrentQ1ResponseSnapshot({ ingestion: {}, analytics: {}, ledger: {}, P: {
  async handleRequest(request, env) {
    assert.equal(request.url, "https://oracle.example.test/api/v1/community/daily?from=2026-04-15&to=2026-10-01");
    assert.equal(env.ENVIRONMENT, "synthetic-development");
    readCalls.push("public");
    return new Response(JSON.stringify(publicBody), { status: 200 });
  },
  async readPublishedStorageCommunityAdminPreview(bindings, pinnedNowMs) {
    assert.equal(bindings.sourceId, "gcp-fastpath-oracle");
    assert.equal(pinnedNowMs, 1_790_856_000_000);
    readCalls.push("admin");
    return adminPreview;
  },
} }, { fromDay: "2026-04-15", throughDay: "2026-10-01" });
assert.deepEqual(snapshot, { publicResponse: { status: 200, body: publicBody }, adminPreview });
assert.deepEqual(Object.keys(snapshot).sort(), ["adminPreview", "publicResponse"]);
assert.deepEqual(readCalls, ["public", "admin"]);

// The public v2 projection keeps its original closed shape, while the D7
// detail seam commits every table, including operational and special tables.
const database = new DatabaseSync(":memory:");
const adapter = {
  prepare(sql) {
    const statement = database.prepare(sql);
    let bound = [];
    const wrapped = {
      bind(...values) { bound = values; return wrapped; },
      all(...values) { const params = values.length === 0 ? bound : values; bound = []; return { results: statement.all(...params) }; },
      first(...values) { const params = values.length === 0 ? bound : values; bound = []; return statement.get(...params) ?? null; },
    };
    return wrapped;
  },
};
try {
  database.exec(`CREATE TABLE collection_controls (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO collection_controls VALUES (1, 'control');
    CREATE TABLE admin_action_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL);
    INSERT INTO admin_action_audit(value) VALUES ('audit');
    CREATE TABLE community_public_source_bootstrap (id INTEGER PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO community_public_source_bootstrap VALUES (1, 'bootstrap');
    CREATE TABLE community_daily_aggregate_rebuilds (day TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO community_daily_aggregate_rebuilds VALUES ('2026-04-15', 'daily');
    CREATE TABLE community_current_analysis_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL);
    INSERT INTO community_current_analysis_queue(value) VALUES ('queue');`);
  const beforeDetails = await captureCurrentQ1SourceInvariantDetails(adapter);
  const beforePublic = await captureCurrentQ1SourceInvariant(adapter);
  assert.deepEqual(Object.keys(beforePublic).sort(), ["audit", "controls", "schemaSha256", "sequences", "sha256"]);
  assert.deepEqual(beforePublic, { sha256: beforeDetails.sha256, schemaSha256: beforeDetails.schemaSha256,
    controls: beforeDetails.controls, audit: beforeDetails.audit, sequences: beforeDetails.sequences });
  const allBefore = beforeDetails.tableDigests.map((entry) => entry.table);
  assert.ok(allBefore.includes("collection_controls"));
  assert.ok(allBefore.includes("admin_action_audit"));
  assert.ok(allBefore.includes("sqlite_sequence"));
  assert.deepEqual(beforeDetails.tableDigests.map((entry) => entry.table), [...allBefore].sort());
  assert.ok(beforeDetails.tables.every((entry) => !["collection_controls", "admin_action_audit", "sqlite_sequence"]
    .includes(entry.table)));

  database.exec(`CREATE TABLE newly_admitted_raw_table (id INTEGER PRIMARY KEY, payload TEXT NOT NULL);
    INSERT INTO newly_admitted_raw_table VALUES (1, 'synthetic');`);
  const afterDetails = await captureCurrentQ1SourceInvariantDetails(adapter);
  const afterPublic = await captureCurrentQ1SourceInvariant(adapter);
  assert.ok(afterDetails.tableDigests.some((entry) => entry.table === "newly_admitted_raw_table"));
  assert.notEqual(afterDetails.fullSourceCaptureSha256, beforeDetails.fullSourceCaptureSha256);
  assert.notEqual(afterDetails.sha256, beforeDetails.sha256);
  assert.throws(() => assert.deepEqual(afterPublic, beforePublic));
} finally { database.close(); }

process.stdout.write("current-q1-d7 bootstrap transition checks passed\n");
