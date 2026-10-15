---
title: R7 admission repair and complete suite verification
date: 2026-10-14
type: plan
status: in-progress
---

# R7 admission repair and complete suite verification

The integrated candidate's two Claude ingestion failures have reviewed and
tested source repairs. The 15 October R7 attempt passed all six synthetic phases
and complete-corpus admission, then failed the unchanged elapsed-resource limit.
All ten original receipts were preserved. A concrete repeated-plan validation
defect and inherited backend failures now have reviewed, focused-test-passing
repairs; R7 receipt freshness,
the full local umbrella gate and final-commit hosted CI remain pending. No
resource limit or test assertion was relaxed. The suite is not green.

The owner requested resolution of the remaining R7 blockers and a complete
green root suite without weakening checks. Work starts from clean
`f86e58b4a79c16bcb0452977e33fdb4d4b5a83c1` and continues the
[security closeout](../reviews/2026-10-13-security-remediation-closeout.md).

Acceptance requires a diagnosed, regression-tested correction where a source
defect exists, independent review, complete protected regeneration of all ten
receipts on frozen source, passing freshness checks, a completed `pnpm run check`
with no failures or cancellations, and passing hosted CI on the final commit.
Existing platform qualification skips
remain explicit; no new skip, relaxed assertion, increased admission limit or
timeout, partial receipt reuse, or private-input alteration is permitted.

| Owner | Responsibility | State |
|---|---|---|
| R7 admission owner | Classify the refused input; fix the confirmed one-byte under-rejection in both Claude tail readers | Implemented and reviewed in `22bf86eed` |
| Admission contract reviewer | Independently trace discovery, line admission, interval filtering, source frontiers and integrity contracts | Existing limit refusal confirmed; strengthening correction specified |
| Benchmark cancellation owner | Propagate cancellation to the owned child without changing workload, timeout or assertions | Implemented in `9b4bb3d5733151efe62f68b713c306ed7f479312`; independent review and 121 focused checks passed |
| Snapshot investigator | Inspect documented artifacts and bounded local metadata for an existing complete, unmodified corpus snapshot | No candidate found in the documented locations checked |
| Coordinator | Integrate reviewed fixes, freeze source, supervise authorized validation and record exact outcomes | Focused repairs reviewed and tested; protected regeneration and final gates pending |

The authorized private-history operation remains local and follows the
[R7 maintenance runbook](../runbooks/2026-08-19-r7-release-evidence-receipt-maintenance.md).
Only content-free diagnostic classifications may leave the reader. Private
history, paths, filenames, identifiers and record contents must not enter
reports, fixtures, logs or external services. The retained interval and both
hash-pinned runtimes remain unchanged. The owner authorized pushing the branch,
updating the PR and merging when ready. Signing, release publication and
deployment remain separate operations.

The previous refresh failed before source-plan freeze with
`operation=create source=claude_transcript reason=export_resource_line_bytes`.
A bounded local byte-count census now establishes one complete structured line
of 30,678,766 bytes above the existing 16,777,216-byte (16 MiB) limit and no
unfinished tails or observed source identity/size changes. No source contents,
filenames or identifiers were parsed,
copied or emitted. The refusal was required by the pre-integration implementation;
interval/type eligibility remains unknown and does not bypass the preparse cap.
The owner was unsure whether a complete unmodified historical snapshot exists.
No input selection, filtering or substitution has been performed.

The bounded snapshot investigation found no raw-corpus candidate in documented
checkout artifacts, R7 transaction artifacts or the documented temporary-root
locations. Plans remain in memory/stdin; backup artifacts preserve receipts or
derived SQLite, not raw history. This is not a claim that no snapshot exists
elsewhere, and no undocumented private location was searched.

Independent synthetic probes found a separate under-rejection: a file with no
newline and exactly limit-plus-one bytes can pass the tail search as an empty
prefix. Correcting both Claude helpers strengthens the existing boundary, but
did not admit the oversized current record under that implementation. The retained oversized-tail
refusal, exact-limit behavior and old frozen-prefix verification must remain.

A synthetic Node test also confirmed that the outer test timeout does not stop
an awaited child when its abort signal is not propagated. The benchmark repair
must prevent receipt emission after cancellation and preserve the private task
tree if termination cannot be confirmed. This is a cleanup defect, not an
established explanation for the initial timing slowdown.

Before main integration, a fresh matrix could not be produced from the current
corpus under the unchanged limit. No blind regeneration retry is justified. Any existing snapshot must be
complete, unmodified and suitable under the same evidence contract; derived
receipts or plans cannot substitute for missing raw input. A passing focused
retry alone is not a green complete suite.

## Verification record

The admission correction passed both complete owning files: 21 transcript
export tests and five incremental-canonicalizer tests. Independent reviews found
no remaining issue in those changes. Architecture and documentation checks
passed before the local commit.

The cancellation owner's permitted serial lane passed 121 tests without skips,
failures or cancellations. The original materialized benchmark and the new
abort-during-final-cleanup regression each retained the complete two-pass
workload and their 30-second limits. A real synthetic `node:test` subprocess
confirmed that test cancellation kills and observes closure of its owned child.
The first restricted execution encountered the known RSS-inspection permission
gap; the permitted run passed without changing an assertion or budget.

Independent cancellation review found no remaining issue and reran the frozen
three-file lane: 121/121 passed, with no failures, cancellations or skips. Both
reviewers confirmed that timeout budgets and existing workload assertions remain
unchanged. Final architecture and all 22 preflight tests passed.

The full root command `pnpm test` completed on clean integration commit
`9b4bb3d5733151efe62f68b713c306ed7f479312`, using Node.js 26.2.0, normal umask
022 and permitted local OS inspection. It ran 6,265 tests in 475.766 seconds:
6,216 passed, two failed, zero cancelled and 47 skipped. The retained platform
skips were unchanged. The original materialized benchmark passed in 6.774
seconds, and the real abort-during-final-cleanup regression passed in 7.228
seconds with the existing 30-second limits.

Both failures are in `test/r7-generated-release-evidence.test.js`: current-code
receipt revalidation and exact decision rebuilding from the eight runtime
inputs. Both reject stale `/contractProvenance/workloadCodeSha256` evidence.
No other failure or cancellation remained in this full run. All ten retained
R7 receipts are byte-for-byte unchanged from the previous closeout, and no
regeneration journal, staging or backup artifact remains. No fresh matrix or
green aggregate suite has been established.

## Pre-integration input blocker

Before integrating current main, the next dependency was an owner-supplied exact location and provenance for an
existing complete, unmodified raw corpus snapshot suitable under the unchanged
identity contract and registered 24 June–25 July 2026 interval. That snapshot
must first pass bounded, owner-only admission and integrity verification. If
it qualifies, regenerate all ten receipts together on frozen source under both
pinned runtimes, rerun freshness checks, and rerun the complete root suite.
Keep any supplied private location out of this document and test artifacts.

The owner was unsure whether such a snapshot exists. No compliant local path to
green remained under the pre-integration implementation with the available inputs. A filtered copy that removes
the oversized record does not preserve the evidence. Changing the admission cap
or input policy requires a separate explicit product decision outside these
repairs. Native qualification, signing, release and deployment remain separate
gates.

## PR integration

The owner authorized pushing a PR and merging when ready. The reviewed source
at `b703ecb38a0737c1453190482bb122d10b741d6a` was pushed as
[draft PR 296](https://github.com/adamallcock/tibotattle/pull/296). The PR remains
draft while the R7 gate above is blocked; hosted checks do not replace the
complete root gate.

Integration with `main` at `7f521836fe7b6e8df7dbb88b53f04a2511dac6ba` resolves
nine overlapping Worker, locale and tool-inventory files. Both parents' locale
keys and inventory records are retained, and generator-owned catalogs and
Worker types are regenerated from canonical inputs. Focused locale tests passed
20/20 and tool-inventory tests passed 6/6. Five documents introduced by `main`
also required portable replacements for private absolute paths under the
unchanged documentation validator; their historical evidence is preserved.

The new GCP edge composition requires explicit appcast admission bindings and
public-probe admission around forwarded health/readiness requests. These
integration repairs retain the existing limits and fail-closed behavior.
The corresponding staging profiles, synthetic snapshots, dry-run harnesses and
pre-credential checks retain those exact operational limits. Maintained staging
callers also exposed missing overlay/reference adapters and an ignored staging
health origin; the repairs preserve the production defaults and existing
isolation checks. No live resources were changed.

Focused integrated Worker validation passed 202 runtime tests and 113 script
tests with no skips or cancellations, plus TypeScript and generated-type checks.
During integration, the unchanged application gates passed: UI 1,094/1,094,
local companion 420/420, macOS transition 127/127, release site 82/82, release
trust 87/87, and local-review runtime. Telemetry mirrors and preflight also
passed. These are source and local test results, not installed/native release
qualification. Complete frozen-source validation must
finish before any stronger readiness claim. The pre-PR root suite result above
remains attributed only to its named commit.

The integration was committed and pushed as
`a1ac524ff5b7ddf73562ada93624ee0f9233bcba`. Independent review cleared the
edge, staging and configuration repairs. Its complete local Worker command
finished with exit 1 after 1,084.058 seconds: the preceding Node phases had
1,304 passes and seven existing PostgreSQL-dependent skips, then Vitest had
2,807 passes and three failures across 184 files. The remaining command stages
were not reached. The three health/readiness parity failures exhausted the
unchanged burst-two admission bucket shared by independent table rows; their
response assertions must remain intact while the scenarios receive isolated
test state and explicit lease-cleanup checks.

Hosted CI also exposed an omitted classification for three newly added
operational rate-limit bindings. The correction declares their exact edge-only
inventory without adding them to the six replay bindings or nine injected
origin bindings. It retains shape, duplicate, missing and unknown-name refusal,
and both origin service planes explicitly reject injection of those bindings.
Independent review cleared this correction. Its focused configuration checks
passed 54/54; the complete owning offline infrastructure gate passed 390/390,
both with zero skips or cancellations.

The parity correction separates the original 14 readiness rows, eight health
rows and five malformed-source values into independent cases. All original
response and exact/absent-source assertions remain, and each migrated request
checks that its named probe budget has zero active leases before the next test
reset. The owning file now passes 39/39 cases, compared with the previous 14
tests containing three failed multi-row cases. Independent review, TypeScript,
documentation and all 23 preflight checks passed. No production admission
limit, timeout or assertion was relaxed. Full root and final hosted results
remain pending for the corrected candidate.

The complete root suite on clean, pushed
`10ed81fb6e0a3adecde214fbbe57f6bc7b559152` finished in 479.127 seconds:
6,394 tests, 6,346 passes, four failures, zero cancellations and 44 platform
skips. Two failures remain the R7 workload-hash freshness checks. The other two
are the incremental same-length mutation rejection and complete-line CR byte
boundary case. The incremental fast path truncates timestamps to milliseconds;
the proposed repair preserves sub-millisecond precision without adding a full
prefix scan to unchanged refreshes. Final assertion details confirm a missing
expected rejection in both Claude cases. Hosted Cloud Run checks passed on
this commit; Worker and PostgreSQL gates are still running.

Main commit `8a2e1783a326762468c7b9eebf3a62e1d67f865b` records an accepted
exporter repair that uses the existing bounded skip-and-count rule for complete
Claude lines incapable of carrying usage. This preserves complete raw inputs
and their integrity coverage, but its literal-only key detection misses escaped
JSON keys. The corrective work must conservatively retain such lines as
potentially relevant, preserve the exact 16 MiB and unfinished-tail limits,
retain irrelevant-line counters and update the boundary fixture to exercise a
usage-bearing record. The maintenance runbook must distinguish this bounded
reader behavior from prohibited input filtering. The private oversized record
has not been classified under the corrected predicate. Only reviewed source,
passing synthetic regressions and a frozen candidate can justify a new protected
regeneration attempt; no private-input retry has occurred at this stage.

On 15 October 2026, both source corrections completed independent review with
no actionable findings. All 52 owning tests passed on each pinned runtime,
Node.js 24.14.0 and 26.2.0, as did the three affected synthetic benchmark cases
on each runtime. Architecture passed with 1,006 production files, 4,367 imports
and zero debt edges; documentation, all 23 preflight checks and whitespace also
passed. The escaped-key regression demonstrably fails against the old source.

The canonicalizer now retains fractional timestamps and migrates v0.2 stores
forward to v0.3 with nullable precision metadata. Legacy rows revalidate their
prefix once before using the unchanged fast path; parsing metrics and bounded
tail work remain intact. A transactional database guard prevents actual v0.2
readers from overwriting the v0.3 schema marker. Historical-reader probes on
fresh and migrated populated stores preserve version, schema and logical rows.
Unknown/newer closed stores are refused without changing their bytes or creating
sidecars. Existing live-WAL reads retain SQLite coordination to see committed
versions; coordination bytes are not claimed immutable. Identical or deliberately
restored filesystem timestamps remain outside the metadata fast-path guarantee.

Both pinned binaries, all ten unchanged owner-only receipt destinations and
absence of transaction artifacts were reverified. The next step is one complete
protected regeneration attempt after committing and freezing these repairs.
This is justified by the reviewed inherited reader policy and its new escaped-key
correction, not by a changed cap, interval, selected corpus or receipt hash.


## Protected attempt and remaining integration work — 15 October 2026

The complete protected attempt at
`ea57471257ab9b3c5b9ba5e1ac2f3419200736d6` held the workload source closure
unchanged throughout execution.
All six synthetic phases passed. The complete shared source plan froze
successfully, clearing the earlier line-admission blocker under the reviewed
reader policy. The history lifecycle subsequently failed with
`export_resource_elapsed_time`; its existing cumulative active-operation budget
is 600,000 ms. The failure did not identify the operation, runtime or pass, so
no exact attribution is claimed. All ten original receipts remained
byte-identical with owner-only permissions, and no transaction or cleanup
artifacts remained. No partial receipt was installed and no input was changed.

Static investigation found that Claude bundle verification revalidated the full
plan for every source, causing quadratic metadata work. The scoped repair uses
one complete validation followed by source-specific verification, retaining
source identities, frozen-prefix hashes, interval checks and caller-mutation
refusal. This is a concrete performance defect and a plausible contributor to
the elapsed failure, not a measured causal conclusion. Independent security and performance reviews are clear. All 29 owning tests
pass on each pinned runtime, including full-plan integrity, later-source prefix
corruption, nested caller mutation, linear metadata scaling and source counters. A separate
reviewed diagnostic change preserves only closed operation/runtime/pass labels
alongside the sanitized failure code; all eight owning tests pass on each
pinned runtime. Neither change alters limits, accounting or receipt admission.

Hosted run `38677723777` at `10ed81fb6` passed Cloud Run. Worker completed
2,835 tests with 2,833 passes and two failures caused by existing five-second
case limits; PostgreSQL repeated eight inherited assertion failures and reached
its unchanged 45-minute job limit. Reviewed candidate repairs restore current
projection identities, distinguish classification-proof reads from usage-fact
probes, complete the exact migration inventory, and execute the blob-verified
historical oracle independently from current code. Historical pricing parity and separate current-pricing coverage now pass
against disposable PostgreSQL 17.11. Worker fixture setup is
batched or split into independent cases while retaining every original
assertion and five-second limit.

PostgreSQL CI is being partitioned into four closed, disjoint parts of the same
95-file canonical plan. Each retains the 45-minute limit, serial file execution
and strict missing/duplicate/skipped-result refusal. A final aggregate requires
all four parts to succeed; no runner or test is removed. All 73 scoped runner/workflow tests and all 87 release-trust tests pass on
Node.js 26.2.0, with zero skips or cancellations; policy validation covers 25
workflow files. Backend runtime validation, the complete final `pnpm run check`,
and final-commit hosted CI must all pass before the authorized merge of PR #296.


The repaired projection paths passed all 35 tests across the three owning files
against disposable PostgreSQL 17.11, with zero skips; Worker TypeScript also
passed. The three Worker timeout cases passed individually in 2,064 ms, 860 ms
and 1,223 ms under their unchanged 5,000 ms default; the full umbrella remains
responsible for unfiltered coverage. Historical-oracle provenance passed against
the actual pinned source. Its first v0.1 comparison reproduced a difference in
pricing method, registry version and registry digest, while contribution costs
matched. The narrow, explicitly historical test composition passed every original
full-row comparison, including usage records. Separate complete current-pricing,
persisted-provenance, replay and retired-route checks also passed. No historical
assertion or production pricing behavior was discarded.


The complete occurrence file passed 20/20 tests, including family-first bounds,
40,000-plus-one refusal, rollback, cancellation and index negative controls.
Both complete historical-oracle and migration-inventory files passed 37/37
with zero skips or cancellations. The four CI partitions, projection repair,
fixture changes, occurrence probe repair, historical oracle and R7 source
changes have independent review and publication-privacy clearance. Documentation,
all 23 preflight checks and architecture also pass. The disposable database was
stopped after validation. The next gate is one complete protected R7 attempt on
the frozen candidate; its success is not presumed from these focused results.
