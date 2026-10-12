---
title: Community model speed publication
date: 2026-10-10
type: decision-record
status: accepted
---

# Community model speed publication

The product owner decided on 2026-10-10 to publish a community-wide model speed
reading from the daily performance stream, in the same form as the desktop
Model performance view. This record states those decisions and the reader
contract they require. It authorizes source work only. Route ports, database
migrations, deployment and runtime activation remain separate protected
operations.

## Context

Clients from 0.1.24 build `model-performance-daily-v1` reports: daily, per
model, effort and speed mode, with fixed-bucket histograms of output speed,
time to first token and full turn time. No hosted service has accepted a
report. The Cloudflare runtime stayed `staged`, and the Google Cloud cutover
retired the performance routes for lack of traffic. Two field dictionaries are
in the field: `telemetry-performance-registry-2026-09-21.1` (0.1.24–0.1.26)
and `telemetry-performance-registry-2026-09-29.1` (0.1.27 onward). The v1 speed
scheme stops at 120 tokens/second, and Spark turns already exceed it.

## Decisions

1. **Restore performance intake on the hosted service.** Port the accountless
   performance grant, capability and report routes. The signed-in consent route
   stays retired with social sign-in. On the Google Cloud line this reverses the
   round 12 retirement of those routes, which requires the reviewed route-class
   change that its production registry demands.
2. **Activate the performance runtime** as a separate owner step after intake
   is deployed and verified.
3. **Accept every released field dictionary.** Readers adapt each one to the
   latest vocabulary through thin adapters; no client version floor.
4. **Keep the client's 7-day first-grant backfill** for now.
5. **Add a speed bucket layout above 120 tokens/second.** The owner's local
   check on 2026-10-10 found Standard daily P90 at or below 75.3 tokens/second,
   one Spark turn at 408 tokens/second, eight Fast turns and no Ultrafast turns.
6. **No privacy minimums.** No contributor, device or sample threshold and no
   dominance cap. Every cell is published with its counts, consistent with the
   public privacy page's existing statement that daily publication has no
   minimum source count or per-source cap. The "reported samples" label stays,
   because it describes accuracy rather than privacy.
7. **Mirror the client view:** per model and speed mode (Standard, Fast,
   Ultrafast); output speed and first-token latency; P10–P90 bands; a point
   below five samples keeps only its median; the same windows and day/week
   regrouping; effort and measurement method pooled.
8. **Show uncertainty.** Every published percentile carries its conservative
   lower and upper bound. Estimates are never presented as exact.
9. **No new disclosure wording** for performance activation. The 2026-09-04
   accountless sharing record is amended accordingly.
10. **Sequence after v1.2.** No intake deployment or migration until the v1.2
    activation-timeout repair is live and verified.

## Reader contract

The telemetry contract package implements the source side:

- `PERFORMANCE_FIELD_DICTIONARIES` registers every dictionary with its state and
  bucket scheme. `accepted` means intake accepts the dictionary: a released
  client emits it, or a merged client change emits it and the servers deploy
  before that client release (server first). `draft` means no client change
  emits it yet, so intake must not accept it. In every state, transport never
  advertises a dictionary the device did not declare.
  `PERFORMANCE_EMITTED_BUCKET_SCHEME_VERSION` is the bucket scheme paired with
  the emitted `PERFORMANCE_FIELD_DICTIONARY_VERSION`;
  `PERFORMANCE_BUCKET_SCHEME_VERSION` keeps meaning v1 for registry rows, schema
  enums and stored SQL checks.
  `adaptTelemetryPerformanceRecord` validates a record under its own dictionary
  and returns its labels in the latest vocabulary by identity: each older
  dictionary is a strict vocabulary subset, and the reviewed model catalog only
  grows. The record keeps its bucket scheme and source dictionary for
  validation. A future rename or removal requires an explicit mapping, not a
  silent widening. An older dictionary's `other` can include Ultrafast, so
  `other` is not comparable across source dictionaries; publication excludes it.
- `performance-histogram-v2` keeps every v1 edge. It adds 10 tokens/second bins
  through 300 and logarithmic bins (×1.15) through about 3,228 tokens/second;
  millisecond metrics are unchanged. Dictionary
  `telemetry-performance-registry-2026-10-10.1` pairs it with the latest
  vocabulary. It is `accepted` server first, before any client emits it.
- Pools combine v1 and v2 histograms exactly below 120 tokens/second. A v1
  overflow count stays unresolved mass, which widens bounds to the observed
  maximum instead of being guessed into a v2 bucket.
- `community-model-performance-v1` is the closed publication shape. It carries
  per-point sample counts, unresolved counts, and estimate/lower/upper bounds
  for each percentile, plus contributor, device and report counts.

Released clients (0.1.24–0.1.28) emit `…2026-09-21.1` or `…2026-09-29.1` with
v1 histograms until a release moves both the dictionary and the bucket scheme.
Report bodies name their dictionary,
but the grant and capability requests do not, and the client refuses a
capability that names a different dictionary. So a capability response must
choose the dictionary per device before any report arrives.
The intended rule infers it from the device's latest v1.2 manifest parser
version until clients declare their dictionary in the grant request. That
transport rule belongs to the intake port and its tests; the
[Google Cloud origin implementation](#google-cloud-origin-implementation)
below records how the origin applies it.

## Google Cloud origin implementation

The Google Cloud origin line carries the intake, publication and admin source
for these decisions. It is source with local PostgreSQL 17 proof only: no
migration has been applied to a live database, no image rolled, no runtime
activated and no slot published. Decisions 2 and 10 still gate each of those
steps. The orchestrator's gate answers of 2026-10-11 settled the open
transport questions within the decisions above; they are recorded here where
they shape behavior. The client switch to `…2026-10-10.1` and grant v2 is
separate client-line source. This line's own client source still emits
`…2026-09-29.1`.

### Storage

One additive primary migration, `0079_performance_telemetry.sql`, holds the
stream. Its number is provisional: the integrator renumbers it, with its pin
set, if the live migration head already holds 0079 or higher.

- `telemetry_performance_field_dictionaries` registers the three accepted
  dictionaries with their bucket schemes. The rows are immutable once seeded,
  and composite foreign keys carry the dictionary and scheme pairing down to
  every bucket row. A later dictionary needs its own migration.
- `telemetry_performance_runtime` is a singleton, seeded `staged` at policy
  revision 1. It moves only from `staged` to `active`, one revision at a time,
  inside the owner activation transaction.
- Grants (`accountless_telemetry_performance_authorizations`), capabilities,
  reports, cohorts, buckets and receipts are append-only. A grant or
  capability moves only to `revoked`, and a report only from `current` to
  `superseded`. Each grant records its `dictionary_basis`.
- `telemetry_performance_refusal_counts` holds content-free refusal counters
  by UTC day, route, code and status.
- `analytics_v2_published_performance` holds one forward-only publication head
  per slot.
- `…2026-09-21.1` keeps the `turn_context_service_tier` speed-mode source that
  the contract allows. Only its Ultrafast labels are refused.

Rows hold closed labels, counts, bucket counts, digests, revisions and
instants. Counters and publication heads carry no participant or device
identifier.

### Routes

The origin registry serves 53 routes. Its `performance` class holds four, all
required-ported in every origin mode:

- `POST /api/v1/accountless/telemetry-performance-authorization` (the grant);
- `GET /api/v1/device/telemetry/performance/capabilities`;
- `GET` and `POST /api/v1/device/telemetry/performance/reports`;
- `GET /api/v1/community/model-performance` (the public read below).

The `admin` class gains `GET /api/v1/admin/performance-intake`. The signed-in
consent route `POST /api/v1/me/device-telemetry-performance-consents` stays
retired with social sign-in and answers `503 POSTGRES_ROUTE_NOT_PORTED`. This
reverses the cutover's round 12 and round 19 retirement of the grant,
capability and report routes, as the
[accountless sharing amendment](./2026-09-04-accountless-sharing-policy.md#performance-sharing-amendment-2026-10-10)
records. The
[API surface](../reference/api-surface.md#community-model-performance-and-the-postgresql-origin)
holds the request and answer details.

While the runtime is `staged`, an authenticated grant, capability read or
report upload answers `403 TELEMETRY_TRANSPORT_BLOCKED` and writes nothing,
and a report read answers 200 with an empty list.

### Grant and dictionary resolution

The grant runs the Worker's checks in the Worker's order, then answers 201
with the exact request body echoed. A principal whose authority kind is not
exactly accountless is `401 DEVICE_AUTH_INVALID`. Each grant stores the
dictionary its device emits, and the capability echoes it in
`requiredConsent.fieldDictionaryVersion`:

- **v2 body** (`accountless-performance-owner-v2` plus
  `fieldDictionaryVersion`, with `policyVersion` and `authorizationBasis`
  unchanged). Any dictionary the contract registry marks `accepted` is
  allowed, with basis `client_declared`. An unknown or unaccepted dictionary
  is `403 TELEMETRY_CONSENT_INVALID`.
- **v1 body** (`accountless-performance-owner-v1`). The dictionary is inferred
  from the parser version of the device's newest v1.2 day manifest (newest
  evidence day, then newest manifest) under a strict integer pattern:
  `unified-rollout-typed-v18` maps to `…2026-09-21.1`, and v19 or higher maps
  to `…2026-09-29.1` (an open range). The basis is `v12_parser_inference`.
  Staged and ready manifests both count as evidence.
- **No evidence.** A v1 grant whose device has no v1.2 manifest, or whose
  newest manifest names an unmapped parser, is granted `…2026-09-29.1` under
  the closed basis `default_no_manifest` rather than refused (gate answer 1).
  0.1.27 and 0.1.28 devices then work, and a 0.1.24–0.1.26 device pauses on
  its own capability check, where a refusal would also have left it. A later
  manifest corrects the choice at the next grant.

Declared beats inferred, and the latest grant wins: a changed dictionary,
basis or expiry appends a revision, and a revoked tuple is never reactivated.
Right after an upgrade, a v1 client's newest manifest can still name its old
parser, so the client pauses until a restart re-grants. Clients that declare
their dictionary avoid that lag.

### Reports

The origin reads a current capability before it decrypts an upload, so a
device without one is refused before any key work. Admission follows the
Worker's order under a per-device-day advisory lock: idempotent replay,
content conflict, capability dictionary, then source-revision order. A new
revision supersedes the current one and writes its cohorts, buckets and one
receipt (`accepted` or `replaced`). A replay writes no receipt and answers
with `idempotency-replayed: true`.

- A report whose dictionary differs from the capability's is
  `403 TELEMETRY_TRANSPORT_BLOCKED` (gate answer 6).
- An invalid record is `409 TELEMETRY_RECORD_INVALID`. Its closed reason
  (`MODEL_UNREVIEWED`, `DICTIONARY_UNACCEPTED`, `SCHEME_MISMATCH`, `ORDER`,
  `DUPLICATE_COHORT`, `DAY_MISMATCH`, `SIZE` or `SHAPE`) goes only to the
  refusal counter, never to the response body.
- A replacement may change dictionary from the prior revision's. This is the
  re-upload path for re-prepared backfill days after a client moves to
  `…2026-10-10.1`; the composed-host test proves it.
- A report read refuses more than 256 reports, 8 MiB of declared bytes,
  16,384 records or cohort rows, or 65,536 bucket rows with
  `400 SYNC_RANGE_TOO_LARGE`.

### Refusal counters

After the device authenticates, every 4xx or 5xx answer also upserts one
`(day, route, code, status)` counter row. The counter has 1-second statement
and lock timeouts, the route waits for it at most 1 second, and the response
never depends on it. Refusals before authentication are not counted. While the
runtime is staged, every capability poll is a counted 403. Local measurement
at concurrency 24 and 64, with the production pool sizes, counted every
refusal. Refused polls took about twice the read latency (p50 35–99 ms), and a
refusal waited the full second only while the counter table was locked.

### Owner-only activation

Activation is the owner-only `run_maintenance` task
`telemetryRuntimeActivation` with target `performance`. It is posted to
`POST /api/v1/admin/action` on the admin host, behind Cloudflare Access and
the admin CSRF check. There is no admin UI control for it (gate answer 23).
The task runs in one top-level transaction. It replays a recorded success,
then requires the current migration receipt, this image's source commit and
migration-history digest, enabled upload-registration and processing
controls, a staged runtime at the expected revision and the image's
dictionary registry. Only then does it write the audit row and move the
runtime to the next revision, together. The 0079 guard accepts the runtime
update only beside an audit row inserted at the top level of the same
transaction. That guard is defence in depth; owner-only activation rests on
the Access chokepoint and CSRF. The
[activation runbook](../runbooks/2026-09-22-telemetry-runtime-activation.md#google-cloud-origin-performance-activation)
holds the exact body and the replay and reconcile rules.

### Publication

The analytics-refresh Job runs a performance stage after the daily
computation, over a snapshot-bound, keyset-paged reader of current reports.
The fold validates each record under its own dictionary, reads it in the
latest vocabulary and builds the twelve `community-model-performance-v1`
slots: periods 1, 7, 30 and all, each for Standard, Fast and Ultrafast.

- The window ends on the latest completed UTC day. Records for later days are
  deferred, and the receipt's `deferredFutureDays` counts their distinct days.
- `community_aggregate_exclusions` also drops performance records on excluded
  participant-days.
- `unknown`, `mixed` and `other` turns are excluded and counted, never
  guessed. Ultrafast is therefore undercounted for 0.1.24–0.1.26 clients,
  which report Ultrafast turns as `other`.
- Top-level contributor, device and report counts include only sources with at
  least one included record of the slot's speed mode in its window.
- Any invalid stored record withholds the whole publication, as do the
  capacity, model-count and point-count limits. A withheld run leaves every
  existing head unchanged.
- Nothing is published until the first run with an included record. After
  that, all twelve slots publish on every run, and an empty payload replaces a
  stale head. The Job refuses a result whose included-record count and named
  models disagree (`ANALYTICS_V2_REFRESH_PERFORMANCE_INVALID`).
- The fold and the reader are analytics-kernel closure inputs, so the stage
  ships under a new kernel registry entry. The analytics method and contract
  versions are unchanged.

`GET /api/v1/community/model-performance?period=<1|7|30|all>&speedMode=<standard|fast|ultrafast>`
reads one slot. It is gated by the public analytics mode and the publication
control, then spends the per-client public read budget it shares with the
community daily route, then checks the query, and verifies the stored head
before answering. A verified 200 is cached `public, max-age=300`. An
unpublished slot is `404 COMMUNITY_MODEL_PERFORMANCE_UNPUBLISHED`, and every
error is `no-store`.

### Admin view and probes

`GET /api/v1/admin/performance-intake` (`admin-performance-intake-v0.1`) is a
read-only, content-free owner view. It shows the runtime state and revision,
grant and capability heads by dictionary and basis, reports by evidence and
arrival day, the dictionary and bucket-scheme mix, cohorts by model and speed
mode, refusal counters, the twelve slots and the last publication run. It also
shows the image's source commit and migration-history digest. It counts grant
rows, not devices able to report, and its 24-hour figures are upper bounds
because counters are kept per UTC day. The browser section ships in the edge
site's admin bundle; the
[operations runbook](../runbooks/production-operations.md#model-performance-intake-google-cloud-origin)
explains how to read it.

The runtime probe adds two content-free gauges,
`performance_newest_accepted_report_age_seconds` and
`community_model_performance_head_age_days`; see
[GCP ops probes](../runbooks/gcp-ops-probes.md#performance-intake-and-publication-signals).

### Rollout

The [GCP rollout runbook](../runbooks/gcp-rollout.md#migration-0079-community-model-speed)
orders the owner steps. Migrate and roll only after the v1.2
activation-timeout fix is live, reprice under the new kernel, and check the
staged intake refusals. Then deploy the edge site: the live edge has neither
new route and answers both with its own 404, so the admin view and the public
read can be verified only through the new edge. Activate only after that
verification. Client 0.1.29 follows, server first.

## Not covered

This record does not authorize remote migrations, route deployment, runtime
activation, client release, or website publication. It does not change usage
v1/v1.1/v1.2, cache-retention calculations or allowance publications. Installed
and deployed behavior need their own evidence. The Google Cloud origin source
described above is not deployment evidence.

## References

- [Daily model performance telemetry requirements](../design/2026-09-20-performance-telemetry-contract.md)
- [Accountless sharing defaults](./2026-09-04-accountless-sharing-policy.md)
- [Schema contracts](../reference/schema-contracts.md#staged-daily-model-performance)
