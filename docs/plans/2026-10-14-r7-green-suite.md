---
title: R7 admission repair and complete suite verification
date: 2026-10-14
type: plan
status: blocked
---

# R7 admission repair and complete suite verification

The source repairs and full root validation are complete. R7 receipt freshness
remains blocked: the available corpus exceeds the unchanged line-admission
limit, and no complete, unmodified replacement snapshot has been identified.
The suite is not green.

The owner requested resolution of the remaining R7 blockers and a complete
green root suite without weakening checks. Work starts from clean
`f86e58b4a79c16bcb0452977e33fdb4d4b5a83c1` and continues the
[security closeout](../reviews/2026-10-13-security-remediation-closeout.md).

Acceptance requires a diagnosed, regression-tested correction where a source
defect exists, independent review, complete protected regeneration of all ten
receipts on frozen source, passing freshness checks, and a completed `pnpm test`
run with no failures or cancellations. Existing platform qualification skips
remain explicit; no new skip, relaxed assertion, increased admission limit or
timeout, partial receipt reuse, or private-input alteration is permitted.

| Owner | Responsibility | State |
|---|---|---|
| R7 admission owner | Classify the refused input; fix the confirmed one-byte under-rejection in both Claude tail readers | Implemented and reviewed in `22bf86eed` |
| Admission contract reviewer | Independently trace discovery, line admission, interval filtering, source frontiers and integrity contracts | Existing limit refusal confirmed; strengthening correction specified |
| Benchmark cancellation owner | Propagate cancellation to the owned child without changing workload, timeout or assertions | Implemented in `9b4bb3d5733151efe62f68b713c306ed7f479312`; independent review and 121 focused checks passed |
| Snapshot investigator | Inspect documented artifacts and bounded local metadata for an existing complete, unmodified corpus snapshot | No candidate found in the documented locations checked |
| Coordinator | Integrate reviewed fixes, freeze source, supervise authorized validation and record exact outcomes | Full root run complete; receipt regeneration blocked pending admissible raw input |

The authorized private-history operation remains local and follows the
[R7 maintenance runbook](../runbooks/2026-08-19-r7-release-evidence-receipt-maintenance.md).
Only content-free diagnostic classifications may leave the reader. Private
history, paths, filenames, identifiers and record contents must not enter
reports, fixtures, logs or external services. The retained interval and both
hash-pinned runtimes remain unchanged. Signing, deployment and publication are
outside this request.

The previous refresh failed before source-plan freeze with
`operation=create source=claude_transcript reason=export_resource_line_bytes`.
A bounded local byte-count census now establishes one complete structured line
of 30,678,766 bytes above the existing 16,777,216-byte (16 MiB) limit and no
unfinished tails or observed source identity/size changes. No source contents,
filenames or identifiers were parsed,
copied or emitted. The refusal is required by the current admission contract;
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
cannot admit the genuinely oversized current record. The retained oversized-tail
refusal, exact-limit behavior and old frozen-prefix verification must remain.

A synthetic Node test also confirmed that the outer test timeout does not stop
an awaited child when its abort signal is not propagated. The benchmark repair
must prevent receipt emission after cancellation and preserve the private task
tree if termination cannot be confirmed. This is a cleanup defect, not an
established explanation for the initial timing slowdown.

A fresh matrix cannot be produced from the current corpus under the unchanged
limit. No blind regeneration retry is justified. Any existing snapshot must be
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

## Required input to resume

The next dependency is an owner-supplied exact location and provenance for an
existing complete, unmodified raw corpus snapshot suitable under the unchanged
identity contract and registered 24 June–25 July 2026 interval. That snapshot
must first pass bounded, owner-only admission and integrity verification. If
it qualifies, regenerate all ten receipts together on frozen source under both
pinned runtimes, rerun freshness checks, and rerun the complete root suite.
Keep any supplied private location out of this document and test artifacts.

The owner is unsure whether such a snapshot exists. No compliant local path to
green remains with the currently available inputs. A filtered copy that removes
the oversized record does not preserve the evidence. Changing the admission cap
or input policy requires a separate explicit product decision outside these
repairs. Native qualification, signing, release and deployment remain separate
gates.
