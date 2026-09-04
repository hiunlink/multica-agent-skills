---
name: to-tickets
description: Break an accepted plan, spec, or completed Wayfinder map into Multica-ready tracer-bullet tickets with project boundaries, execution contracts, acceptance criteria, and blocking edges.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it.

The issue tracker contract should have been provided to you — run `/setup-multica-skills` if not.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it and read its full body and comments.

The existing Spec/Issue/URL input remains sufficient; a Story Map export is
optional. If the user also provides a `story-map.json`, read and validate it as
a scope-and-context supplement, then use its accepted `selectedRelease` as the
boundary for ticket drafting. Do not silently include cards from other
releases or the unarranged pool.

When no Story Map JSON is provided, preserve the normal Spec-based workflow.
If that Spec is too broad to ticket safely, surface the scope problem and ask
the user to narrow or confirm the intended boundary rather than inventing one.
When the missing work is decomposition plus human arrangement, recommend
`/story-mapping`; the user can then arrange the map and return its accepted
JSON, or explicitly confirm the Spec-only boundary.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

Load repository guidance and carry forward exact required docs, allowed and
forbidden paths, module boundaries, data/sync/privacy constraints, validation
expectations, and human-owned decisions. When a Story Map JSON is supplied,
load the consuming repository's Story Mapping profile (when present) for
project-specific vocabulary and extension validation.

### 3. Draft vertical slices

Break the requested Spec scope into **tracer bullet** tickets. When a
`story-map.json` is present, use only the cards in its accepted
`selectedRelease`; otherwise use the scope established by the Spec and the
conversation. A single Story Map card may require multiple tickets, and one
invocation may plan multiple selected slices, but each resulting ticket must
remain independently verifiable and sized for a single fresh context.

A Story Map card is a product-scope input, not automatically a ticket. Preserve
its Activity/parent context, card order, source references, dependencies, and
project-defined `extensions` while creating the execution contracts below.
Treat map ordering and semantic loop transitions as product context, not
execution blockers unless codebase exploration confirms a genuine blocker.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges** — the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

### Optional Story Map JSON input

When supplied, the JSON must identify its source Spec and include an accepted
arrangement before it can narrow ticket scope:

- `source` — the Spec/Issue reference;
- `arrangementStatus` — must be `accepted` for automatic scope narrowing;
- `selectedRelease` — the Release lane to ticket;
- `activities` and `cards` — the ordered Activity context and selected Story
  Map cards;
- `extensions` — optional namespaced project metadata, which must be preserved
  as context without interpreting unknown namespaces in the generic skill.

If the source does not match, the arrangement is still a draft, or
`selectedRelease` is missing, stop and ask the user to correct or confirm the
input. This validation does not remove the ability to run `/to-tickets` from a
Spec alone.

For boundary-heavy work, load and enforce
[EXECUTION-CONTRACT.md](./EXECUTION-CONTRACT.md). An incomplete contract blocks
publication as executable `todo`; create a decision/research ticket or keep it
in `backlog` instead.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket — green is promised only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct — does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the tickets to the configured tracker

Publish the approved tickets according to `docs/agents/issue-tracker.md`.

Before mutation, inspect the worktree. If a ticket depends on uncommitted docs,
config, fixtures, scripts, or planning artifacts, identify them and stop for
user confirmation rather than handing another agent invisible local state.

- **Multica** → publish one child issue per ticket in dependency order so each ticket can reference real blocker identifiers. Only unblocked, contract-complete tickets start as `todo`; use `backlog` or `blocked` for the rest.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

Recommend an implementation runtime using repository context, but leave tickets
unassigned unless the user approves assignment. Assigning a Multica agent can
enqueue work immediately; never assign merely to record a recommendation.

Do NOT close or modify any parent issue.

<issue-template>

## Parent

A reference to the parent issue on the tracker (if the source was an existing issue, otherwise omit this section).

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective — not layer-by-layer implementation.

## Project constraints

- Target area:
- Allowed paths:
- Forbidden paths:
- Module boundary:
- Docs to read:
- Validation:

## Execution contract

- Source of truth:
- Exact contract:
- Non-goals and forbidden shortcuts:
- Cross-operation invariants:
- Required negative tests:
- Review gate:

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None — can start immediately".

</issue-template>

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.
