---
name: requirements-to-spec
description: Synthesize a completed requirements-driven Wayfinder map into a traceable product and architecture spec for existing to-tickets vertical slicing. Use only when Product Outcomes, User Jobs, Must Use Cases, behavior contracts, capabilities, data, placement, and interfaces are mature.
disable-model-invocation: true
---

# Requirements To Spec

Turn a mature requirements-driven conversation or completed
`/requirements-wayfinder` map into a durable spec, then publish it to the
configured tracker as an unassigned planning artifact. This is the
requirements-driven counterpart to `/to-spec`; it preserves upstream product
and architecture traceability but does not replace `/story-mapping` or
`/to-tickets`.

Do not interview the user and do not fill gaps with plausible assumptions. If
required decisions are missing, report the exact gap and route back to the
Wayfinder map instead of publishing a misleading spec.

## Inputs

1. Read the complete Wayfinder Map.
2. Read every decision linked from `Decisions so far` that contributes to the
   spec, plus its resolution comment.
3. Read any accepted research or prototype assets those decisions cite.
4. Load the consuming repository's glossary, accepted ADRs, tracker contract,
   language policy, and current implementation facts.
5. Treat unresolved tickets, fog, rejected alternatives, and uncommitted
   candidate documents according to the project's authority rules; they are not
   accepted requirements.

## Readiness gate

Publish only when the source establishes or explicitly excludes:

- Planning Destination and Product Outcome;
- actors and User Jobs;
- an end-to-end story map and priorities;
- Must Use Cases;
- Behavior Contracts, including relevant failure and degradation;
- Product Constraints;
- Required Capabilities and Data;
- Responsibility Placement;
- Interfaces and important invariants;
- evaluation and testing expectations;
- out-of-scope and deferred behavior.

Not every spec needs every section to be large. An item may be concise or
explicitly out of scope, but it must not be silently absent when it changes the
architecture or acceptance behavior.

## Test seams

As in `/to-spec`, identify the highest stable seams through which behavior can
be verified. Prefer existing seams and fewer interfaces. Confirm the proposed
test seams with the user before publication. Tests should observe behavior and
survive internal refactoring.

## Spec template

Write in the consuming repository's working language.

```markdown
## Problem Statement

Describe the actors' situation, unmet progress, current alternatives, and why
the problem matters. Do not describe the chosen implementation here.

## Product Outcome

State the accepted change in the actors' situation, behavior, or experience.
Keep it distinct from the planning deliverable and technical solution.

## Actors and User Jobs

For each primary or materially affected actor, record the situation, desired
progress, and important current alternative or failure cost. Distinguish
evidence from retained assumptions.

## Story Map and Priority

Present the end-to-end backbone in user sequence, with the stories beneath each
activity ordered by priority. Identify Must, Should, Could, and Won't-now
behavior. Preserve a coherent user journey rather than a flat feature backlog.

## Must Use Cases

List the high-priority end-to-end use cases that define the accepted scope.
Give each a stable name or identifier for downstream traceability.

## Behavior Contracts

For each Must Use Case, capture its actor and goal, trigger, preconditions,
success behavior, relevant alternatives/failure/degradation, user-visible
guarantees, privacy/safety/permission behavior, and evaluation signal. Use
observable behavior, not internal implementation steps.

## Product Constraints

Record privacy, security, safety, latency, availability, offline, compatibility,
cost, compliance, recovery, and accepted ADR constraints that shape the
solution. Include only constraints relevant to this spec.

## Required Capabilities and Data

Trace each Must Use Case to the behavior the system must perform and the
information required to perform it. Record relevant data sensitivity,
freshness, authority, retention, and failure implications. Do not confuse a
capability with a module or a data need with a database schema.

## Responsibility Placement

State where the required behavior and data responsibility live and why that
placement follows from the behavior and constraints. Record important rejected
placements and consequences.

## Interfaces and Invariants

Define the stable seams callers and tests rely on: interactions, ordering,
errors, permissions, idempotency, consistency, and performance characteristics.
Avoid volatile file paths and implementation-only details.

## Implementation Decisions

Record the accepted modules, adapters, schemas, migrations, protocols, and
other technical decisions necessary to implement the spec. Do not invent
decisions that the source map left unresolved.

## Testing and Evaluation

Map Must Use Cases and Behavior Contracts to automated tests, integration or
end-to-end journeys, manual acceptance, and qualitative evaluation where
deterministic tests are insufficient. State the chosen test seams and required
negative coverage.

## Ticket Slicing Guidance

Preserve the complete product panorama, but do not silently turn it all into
first-release work. If the source discussion has already accepted a release
boundary, record it here. If the resulting Spec is broader than the next
release needs, hand it to `/story-mapping` for decomposition and user-owned
arrangement before `/to-tickets`; if it already contains one coherent, bounded
outcome, `/to-tickets` may follow directly. The release boundary is a product
prioritization decision, not an implementation estimate.

Instruct `/to-tickets` to use its existing tracer-bullet vertical-slice rules,
keep tests inside each slice, and avoid separate frontend, backend, database,
or test-only horizontal tickets unless a documented wide refactor requires
expand-contract sequencing. A single release may contain multiple vertical
slices, but they remain separately verifiable execution units.

## Out of Scope

State what this spec deliberately does not solve.

## Deferred and Open Questions

Preserve intentional deferrals and non-blocking questions. A decision still
required for correct implementation is a blocker, not a note in this section.

## Traceability

Link the source Wayfinder Map and the decision tickets or accepted ADRs that
establish the Product Outcome, Must Use Cases, constraints, placement, and
interfaces. Do not copy full decision histories into the spec.
```

## Publication

Publish the spec according to the repository's tracker contract, unassigned and
in its planning state. Publication does not start implementation. Tell the user
to review and accept the spec, then use the existing `/to-tickets` skill.

## Avoid

- Do not flatten the story map into a long, unordered feature list.
- Do not replace User Jobs with features written in "As a user" grammar.
- Do not omit failure, degradation, privacy, or evaluation behavior from Must
  Use Cases.
- Do not promote fog, assumptions, rejected options, or candidate architecture
  to accepted decisions.
- Do not duplicate `/story-mapping` or `/to-tickets`, and do not create
  implementation tickets here.
- Do not introduce another specification framework unless the user separately
  chooses one.
