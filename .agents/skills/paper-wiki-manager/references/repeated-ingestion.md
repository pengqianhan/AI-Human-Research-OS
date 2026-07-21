# Repeated Paper Ingestion

Use this protocol whenever `papers/<arxiv_id>.md` already exists. Keep one
consolidated canonical paper page: do not append another generated summary or a
second body template wholesale.

## Contents

1. [Ownership](#ownership)
2. [Decision Flow](#decision-flow)
3. [Evidence and Merge Rules](#evidence-and-merge-rules)
4. [Review Gates](#review-gates)
5. [Localized Notes](#localized-notes)
6. [Reading State and History](#reading-state-and-history)
7. [Version-Control Fallback](#version-control-fallback)
8. [Result Report](#result-report)

## Ownership

Treat the canonical English paper as the source of truth for bibliographic
metadata, paper claims, evidence boundaries, status, graph identity, topics,
concepts, and project links.

Treat these sections as human-owned and append-only unless the user explicitly
asks for a rewrite:

* `# Notes`
* `# 个人笔记`
* any section the user explicitly identifies as personal or protected

Do not delete, paraphrase, reorder, or silently merge generated prose into a
protected section. If ownership of a custom section is unclear, return
`needs-review` before changing it.

Treat standard summary sections as manager-maintained. They may be consolidated
section by section when the evidence and review gates below permit it. Treat
`# Reading History` as manager-maintained but append-only.

## Decision Flow

1. Resolve the arXiv identity and read the canonical paper, localized mirror,
   incoming material, current paper version, and every source needed for the
   fidelity pass.
2. Compare the incoming material with the existing canonical page at both the
   exact-content and claim levels. Do not use wording differences alone as
   evidence of new knowledge.
3. Classify the run before editing:
   * `no-op`: no new version, evidence, correction, interpretation, link, or
     human note exists.
   * `merged`: all substantive changes are additive or evidence-resolvable and
     pass the automatic-merge rules.
   * `needs-review`: at least one high-impact or ownership ambiguity requires a
     human decision.
4. For `no-op`, make no file changes at all. Do not update timestamps, indexes,
   `viz.html`, `reading_round`, or `# Reading History` merely to record that the
   manager ran.
5. For `merged`, map each accepted claim into the existing section with the
   closest semantic purpose. Preserve the existing heading layout. Add a new
   section only when the material has no honest home; never append a second
   complete profile.
6. Run the normal topic, concept, citation, visualization, and validation steps
   only when the merge produces a real wiki change.

## Evidence and Merge Rules

Admit a claim to manager-maintained paper sections only when one of these holds:

* The full paper or another source listed under `# Citations` directly supports
  it.
* It is explicitly labelled as a reader-constructed inference or cross-paper
  comparison and its supporting sources are named.

If a claim appears only in generated prose and cannot be traced to an original
source, do not merge it as fact. Return `needs-review` or place it in a protected
human-note section only when the user identifies it as their own observation.

Resolve conflicts in this order:

1. An explicit correction in a newer paper version supersedes the older claim;
   update it and record the correction in Reading History.
2. Direct full-paper evidence supersedes unsupported generated prose.
3. When two model interpretations remain plausible, preserve the ambiguity and
   return `needs-review`; do not pick one by fluency.
4. Never overwrite a conflicting human note. Keep it verbatim and describe the
   evidence difference outside the protected section after approval.

Remove duplication within a managed section when consolidating it, but do not
delete an established claim merely because the new input omits it.

## Review Gates

Pause before editing and return `needs-review` when a proposed merge would:

* change the central problem, method, hypothesis, headline result, or a
  load-bearing number because of an unresolved interpretation rather than an
  explicit source correction;
* delete an established conclusion instead of supplementing or locally
  correcting it;
* materially reorganize multiple existing sections;
* retain an unresolved factual or interpretive conflict;
* touch content whose human-versus-manager ownership is unclear; or
* perform a destructive rewrite without recoverable version history.

Show the proposed changes and the evidence that caused the gate. Routine
additions, deduplication, source strengthening, link maintenance, and explicit
paper corrections may merge automatically.

## Localized Notes

Merge the English canonical first, then synchronize only its substantive
paper-grounded changes into `papers_zh/<arxiv_id>.md`. Preserve natural Chinese
structure and every protected personal section. Do not copy `# Reading History`
into the mirror.

When the incoming material is a Chinese reading note, route verifiable paper
facts into the canonical managed sections, labelled reader interpretations into
the corresponding managed section, and personal ideas or project connections
into a protected Chinese section. If that classification is ambiguous, stop at
the review gate.

## Reading State and History

Increment optional `reading_round` only for a genuine human reading pass: the
human supplies a new note or explicitly says this is another reading round. Do
not increment it for duplicate ingestion, metadata refresh, link repair, or an
automatic paper-version check. If no prior value establishes a count, do not
guess one.

For every substantive completed merge, append one compact entry to the
canonical `# Reading History` using the format in [schema.md](schema.md). Record
the date, paper version, input kind, result, affected sections, material
additions or corrections, unresolved conflicts retained after approval, and
the input source when one exists.

Do not store full previous or incoming notes in Reading History. Git holds the
complete revisions. Do not write a history entry for a pre-approval
`needs-review` result that made no file change. If the user approves preserving
an unresolved conflict in the canonical page, the durable entry may use
`needs-review` as its result.

## Version-Control Fallback

Check whether the wiki has recoverable version history before a merge that
deletes or substantially rewrites managed content. With Git, preserve history
through the normal worktree and commit flow; this protocol does not authorize a
commit by itself.

Without Git or an equivalent version store, allow purely additive merges. For a
destructive or large rewrite, pause and ask whether to create a timestamped
backup outside the wiki graph or proceed after explicit confirmation. Never
hide full snapshots inside the canonical paper page.

## Result Report

Return these four items after every repeated-ingestion run:

* `result`: `no-op`, `merged`, or `needs-review`;
* sections changed or proposed;
* protected human content preserved; and
* unresolved conflicts, or `none`.

For `no-op`, state that no files changed. For `needs-review`, identify the exact
decision and evidence required; do not present a proposed rewrite as completed.
