---
title: Close the stranded v1.1 preview failure
date: 2026-10-12
type: plan
status: locally-qualified-awaiting-rollout
---

The owner admin preview still fails with `BACKEND_STORAGE_UNAVAILABLE`.
Completion requires the corrected origin to serve traffic and a successful
read-only preview through the actual admin UI. Source tests alone do not close
the incident. Activating recovered uploads and verifying their later publication
remain distinct operations under the
[recovery runbook](../runbooks/2026-10-11-stranded-telemetry-recovery.md).

## Verified starting evidence

- This checkout starts clean at `7f521836fe7b6e8df7dbb88b53f04a2511dac6ba`.
- The public health endpoint on 2026-10-12 reports origin source
  `7a4bc73ebbc096754adb954fbb2051a6b28b8b35`. The live admin page shows
  the failed preview and disables activation.
- The origin composition reads `env.POSTGRES_RATE_LIMIT_SECRET`, but
  `createProductionWorkerEnv` deliberately excludes origin-only secrets.
  `cursorCodec` consequently refuses before any recovery database query.
- Existing correction `ac66eace2c01f1190e5974ec198dbf58dd8b2080` passes
  the already validated `keyHashSecret` directly into owner maintenance.
  Its regression exercises synthetic Access authentication, CSRF and a
  read-only preview through the shared runtime composition; it also checks
  that the secret remains outside Worker bindings and responses.
- Draft PR #289 preserves the earlier correction. Active follow-through PR #292
  contains its forward-port `ffc15661d8c5a35c99643e1a8ace793732b7c934`.
  Published head `0fdc0cfd1e5264d2b8b500ff16eedd134cfe30f3` has a failed
  Worker check and cancelled PostgreSQL check. The clean local follow-through
  head is `24cddab30e184d769011e86ebab2151b7d4a5e90`; complete checks remain
  with the existing integration owner.
- Cloud Run readback confirms revision `tibotattle-origin-00014-t7s` receives
  100% of traffic, image SHA-256
  `e3e75cfaddb936c08123aa6cb679ee13a72b5d47aa031ad9146da6599e09e112`.
  This binds the observed revision to an image; the source declaration alone
  does not attest image build provenance.
- The two patch-base blobs of `ac66eace2` exactly match the declared serving
  source. Its Docker image targets Node 22; local Node 22.16.0 is available.
  The deployed origin and edge source have identical edge-contract blobs.

## Narrow origin candidate assessment

The existing integration owner assigned this lane the independent narrow
origin qualification. Branch `codex/stranded-v11-preview-hotfix-20261012` starts
at the exact serving source and contains both existing corrections. Its product
files match the reviewed `ac66eace2` and `83163549` blobs exactly. This is
independent of the broad main convergence and retains kernel 16.

The `831635490392351484ff4b5193dbf48317a746d9` correction aligns preview's
ten-minute quiet period with execution's existing 24-hour client-ownership
fence. New real-PostgreSQL assertions cover one millisecond before expiry,
exact expiry and one millisecond after expiry. Preview preserves the recorded
state, still-owned tokens never reach activation, and the two expired cases
each append exactly one accepted receipt and journal entry. The runbook now
describes the existing execution boundary accurately.

## Local qualification

All database fixtures are synthetic, on a separately owned loopback-only
PostgreSQL 17.10 instance. No production recovery has run.

| Gate | Result |
|---|---|
| Actual runtime-constructor regression, Node 22.16.0 | Original wiring reproduced HTTP 503; fixed wiring returned HTTP 200 through synthetic Access and CSRF |
| Origin host and configuration, Node 22.16.0 | 21 host and 28 configuration cases passed |
| v1.1 recovery and v1.2 unchanged/replay, Node 22.16.0 | 18 PostgreSQL cases passed, including the ownership boundary |
| Admin console, Node 26.2.0 | 11 PostgreSQL cases passed; its D1 comparison needs Node 24.10 or newer |
| Complete Cloud Run source check, Node 26.2.0 | 575 passed, four database-environment skips; both owning files rerun with PostgreSQL: 33 passed, zero skips |
| Admin browser contracts | 105 passed |
| Worker adoption route | Nine passed |
| Worker TypeScript | Passed |
| Documentation, preflight, architecture | Passed; preflight 21/21 |
| Canonical origin build, Node 22.16.0 | All 13 bundles built, kernel 16 retained |

The kernel closure remains
`d2e867213fe9656f6edf91d0ac991cb293a323f3b2cd84af7d79c0ac431f39f4`.
The migration tree, kernel registry, edge-origin contract and admin/web assets
are byte-identical to the serving source. No secret value or binding is added.

The first dependency-incomplete run is retained as an environment failure.
Node 22 source-tooling subprocesses cannot load bare TypeScript; the canonical
full tooling check therefore uses Node 26, while the runtime regression and
bundle build are also checked on Node 22. A direct Docker-only migration-path
check cannot run outside its `/app` image layout. The local Docker daemon is
unavailable; the protected Cloud Build and its image/provenance receipt remain
required before deployment. None of these local checks claims a built image
or a repaired live preview.

The independent read-only review found no actionable blocker. It checked exact
product-blob equivalence, secret and identity exclusion, the frozen-clock
boundary assertions, real predecessor/activation behavior and scoped changes.
Review is separate from the runtime results above and does not authorize release.

## Ownership and remaining gates

1. The existing integration owner retains PR #292 and main. This branch owns
   only the narrow origin correction. Local checks and independent review are
   complete; bind the recorded final local commit to the protected rollout.
2. Use the existing guarded operator and production deployment lock. A build
   dry run resolves the intended production source bucket and lock without
   external writes. Obtain fresh infrastructure, backup and edge readbacks,
   image provenance and the required migration receipt. An unchanged schema
   does not waive the operator's receipt requirements.
3. Resolve explicit authorization for the concrete production build and rollout.
   Coordinate diagnostic-job cleanup and scheduler quiescence before preflight;
   never interrupt another lane's job or bypass a rollout refusal.
4. Read back the serving source and run the real admin preview. Keep opaque
   cursors in memory and retain only aggregate results. A healthy endpoint
   without a successful preview is insufficient.
5. Review any eligible cohort before activation. Preserve separate authorization
   and receipts for activation and subsequent journal/publication verification.

No new production reads of participant rows, temporary diagnostic jobs, secret
rotation, desktop release or data migration are needed to establish this cause.
