---
name: agent-task-intake
description: Route an ambiguous, risky, or long-running agent task to execution, issue-workspace, Wayfinder, research, prototype, spec, tickets, domain modeling, backlog, or rejection. Use when the user asks whether or how work should start; do not invoke for an explicit, bounded implementation request.
---

# Agent Task Intake

Choose the right workflow before work starts. This is an optional router, not a
mandatory ceremony before every agent task.

## Use when

- The user asks whether an idea should start, be deferred, or be investigated.
- Scope, risk, autonomy, ownership, or session size is unclear.
- Work may span several agent sessions.
- The user wants to decide between discussion, planning, specification, ticket
  shaping, or direct implementation.

Do not invoke when the user has already requested a clear, bounded action that
the agent can implement and verify directly.

## Route

Choose exactly one primary route:

- **`execute`**: the requested outcome is clear, fits one session, and can be
  verified without another product or architecture decision.
- **`issue-workspace`**: one bounded unresolved discussion needs a durable
  parking place.
- **`wayfinder`**: reaching the destination requires several dependent
  decisions or investigations across more than one session.
- **`research`**: the next decision is blocked by facts outside the current
  workspace or by primary-source reading.
- **`prototype`**: a cheap concrete artifact is needed before a human can make
  the next decision.
- **`to-spec`**: goals, scope, behavior, and implementation decisions are
  settled enough to synthesize without another interview.
- **`to-tickets`**: an accepted plan or spec is ready to become executable,
  independently verifiable slices.
- **`domain-modeling`**: terminology needs sharpening or a settled durable
  decision may deserve an ADR.
- **`backlog`**: the idea is useful but lacks a trigger, owner, prerequisite, or
  priority that would justify active work.
- **`do-not-start`**: the request is unsafe, misleading, valueless, or cannot be
  bounded enough to proceed responsibly.

Do not use `to-spec` or `to-tickets` to hide unresolved decisions. Do not use
Wayfinder for work whose route is already clear and fits one session.

## ADR test

An architecture-related request does not automatically require an ADR. Route to
Wayfinder while the decision is unsettled. Route to `domain-modeling` for an ADR
only when the decision is:

1. hard to reverse;
2. surprising without its context; and
3. the result of a real trade-off.

## Risk and autonomy

Use [risk-rubric.md](./references/risk-rubric.md) only when risk affects the
route or the user asks for a risk assessment.

- Low-risk, bounded work may execute autonomously.
- Medium-risk work may execute after repository inspection establishes a clear
  boundary and validation path; do not require a separate approval by default.
- High-risk work stays human-led at decision points. Use research, prototype,
  or Wayfinder to resolve uncertainty before implementation tickets are made.

Detailed fields, invariants, negative tests, and review gates belong to
`to-tickets` and its execution contract, not to intake.

## Multica safety

Intake recommends a route only. Do not create issues, change status, or assign
an agent unless the user explicitly asks to persist or start work. In Multica,
agent assignment may enqueue a run and is never passive metadata.

## Output

Keep the result proportional to the uncertainty. Default to:

```text
Route: <primary route>
Why: <one or two sentences>
Risk: <low | medium | high>
Human gate: <none | exact decision/approval required>
Next: <one concrete action or skill>
```

For `execute`, add only the high-level allowed area, forbidden boundary, and
validation signal needed to keep implementation safe. Do not emit a large
intake form for trivial work.
