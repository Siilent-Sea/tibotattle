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
  bucket scheme. Released dictionaries are `accepted`. A dictionary no client
  emits yet is `draft` and must not be advertised by transport.
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
  vocabulary and stays `draft` until a client emits it.
- Pools combine v1 and v2 histograms exactly below 120 tokens/second. A v1
  overflow count stays unresolved mass, which widens bounds to the observed
  maximum instead of being guessed into a v2 bucket.
- `community-model-performance-v1` is the closed publication shape. It carries
  per-point sample counts, unresolved counts, and estimate/lower/upper bounds
  for each percentile, plus contributor, device and report counts.

Clients keep emitting `…2026-09-29.1` with v1 histograms until a release moves
both the dictionary and the bucket scheme. Report bodies name their dictionary,
but the grant and capability requests do not, and the client refuses a
capability that names a different dictionary. So a capability response must
choose the dictionary per device before any report arrives.
The intended rule infers it from the device's latest v1.2 manifest parser
version until clients declare their dictionary in the grant request. That
transport rule belongs to the intake port and its tests.

## Not covered

This record does not authorize remote migrations, route deployment, runtime
activation, client release, or website publication. It does not change usage
v1/v1.1/v1.2, cache-retention calculations or allowance publications. Installed
and deployed behavior need their own evidence.

## References

- [Daily model performance telemetry requirements](../design/2026-09-20-performance-telemetry-contract.md)
- [Accountless sharing defaults](./2026-09-04-accountless-sharing-policy.md)
- [Schema contracts](../reference/schema-contracts.md#staged-daily-model-performance)
