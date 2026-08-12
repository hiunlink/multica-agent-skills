---
name: requirements-wayfinder
description: Plan a large product or user-facing architecture effort from Product Outcomes, User Jobs, story maps, Must Use Cases, and behavior contracts. Use when the user explicitly asks for a requirements-driven Wayfinder or when solution-first planning must be reset around user needs.
disable-model-invocation: true
---

# Requirements Wayfinder

Apply a requirements-driven planning profile on top of `/wayfinder`. Load and
follow `/wayfinder`, `/grilling`, and `/domain-modeling`; this skill adds product
discovery and traceability rules without replacing Wayfinder's map, frontier,
blocking, fog, ticket types, or Multica operations.

Use this profile for product capabilities, user experience, AI behavior,
privacy or recovery choices, subscriptions, and architecture whose placement
changes what users can experience. Use ordinary `/wayfinder` for bounded
technical selection or migration work whose outcome and acceptance behavior are
already established.

## Two destinations

Keep these concepts separate:

- **Planning Destination**: what completing this map produces, such as an
  accepted spec ready for `/to-tickets`.
- **Product Outcome**: the change in an actor's situation, behavior, or
  experience if the product succeeds.

Name the Planning Destination when charting begins. Treat the initial Product
Outcome as a hypothesis until the map resolves or explicitly scopes it. The map
achieves its Planning Destination only after the required product and
architecture decisions are settled; the Product Outcome is not generated at
the end of the map.

## Traceability spine

Use this as a coverage and traceability model, not as irreversible phases or a
fixed list of tickets:

```text
Planning Destination
-> Product Outcome hypothesis
-> Actors and User Jobs
-> Story Map and priority
-> Must Use Cases
-> Behavior Contracts and product constraints
-> Required Capabilities and Data
-> Responsibility Placement
-> Interfaces
-> accepted spec
-> tracer-bullet tickets
```

Research, prototypes, constraints, or implementation facts may send the map
back upstream. Never preserve a downstream decision after its upstream reason
has changed without reviewing it.

## Chart the map

Follow Wayfinder's normal charting workflow with these additions.

### 1. Name a solution-neutral Planning Destination

The Destination should describe the accepted planning artifact and its
readiness, not mandate a candidate solution. A suitable default shape is:

```markdown
## Destination

Produce an accepted, ticket-ready spec for <topic>. High-priority behavior is
traceable to User Jobs, and the required capabilities, data, responsibility
placement, and interfaces are resolved or explicitly out of scope.
```

If the user's stated destination already mandates a database, cloud placement,
module, or vendor, record it as a candidate or constraint unless the decision
has an accepted source.

### 2. Grill the problem before the solution

The first design-tree frontier should establish enough of the following to
avoid solution-first planning:

- actors and affected stakeholders;
- the situation and progress each actor is trying to make;
- current alternatives and failure costs;
- Product Outcome hypotheses;
- evidence, assumptions, and human-owned product decisions;
- success signals and explicit scope.

Finding facts is the agent's job. Product priorities and trade-offs remain
human decisions. Never invent user research or promote an assumption to a
confirmed need.

### 3. Map behavior breadth-first

Before drilling into schema, storage, deployment, or interfaces, map the
end-to-end user activities and stories. Use a story map to preserve sequence
and omissions, then identify Must, Should, Could, and Won't-now behavior. Only
high-priority behavior needs a detailed contract.

A Must Use Case should state at least:

- actor and goal;
- trigger and preconditions;
- main success path;
- relevant alternatives, failure, and degradation;
- user-visible guarantees;
- privacy, safety, or permission behavior where applicable;
- a success or evaluation signal.

Do not turn every story, field, or checklist item into a decision ticket.
Related judgments that share prerequisites may be resolved in one grilling
ticket. Create a ticket only when its question is precise and independently
decidable; keep the rest in fog.

### 4. Derive capabilities and data before placement

For each Must Use Case, identify:

- **Required Capability**: behavior the system must be able to perform, without
  naming its module, vendor, process, or deployment location.
- **Required Data**: information that capability needs, including sensitivity,
  freshness, authority, retention, and failure implications where relevant.

Only then decide Responsibility Placement and Interfaces. A technical decision
ticket must cite the User Job, Must Use Case, Behavior Contract, or Product
Constraint it serves. If it cannot, keep it out of the core architecture until
its value is established.

### 5. Persist the profile in Map Notes

The invocation prompt is temporary; the Map is durable. Include standing
instructions equivalent to:

```markdown
## Notes

- Planning profile: requirements-driven.
- Keep Planning Destination and Product Outcome distinct.
- Confirm Actors, User Jobs, the story map, priorities, and Must Use Cases
  before committing to capabilities, data, responsibility placement, or
  interfaces.
- Treat existing solutions as candidates unless backed by an accepted decision.
- Require major technical decisions to trace to an upstream user behavior or
  product constraint.
- Use research for external facts, prototype for uncertain behavior or state,
  and grilling plus domain-modeling for human-owned trade-offs.
- Treat the traceability spine as reversible coverage, not a waterfall or a
  fixed ticket list. Keep unsharp questions in Not yet specified.
- Plan by default; do not implement production work inside this map.
- Use `/requirements-to-spec` after the readiness checks pass, then use the
  existing `/to-tickets` for tracer-bullet vertical slices.
```

Add repository-specific language, glossary, ADR, safety, and tracker rules from
the consuming project. Do not replace them with this generic text.

## Readiness checks

These are coverage checks, not approval bureaucracy or mandatory sequential
gates.

### Problem readiness

- Planning Destination is solution-neutral or its mandated constraints have an
  accepted source.
- Product Outcome, actors, and User Jobs are explicit.
- Evidence, assumptions, decisions, and open questions are distinguishable.

### Behavior readiness

- The story map covers the important end-to-end journey.
- Must Use Cases and their priorities are explicit.
- Must behavior includes success, relevant failure/degradation, user-visible
  guarantees, and evaluation signals.

### Architecture readiness

- Required Capabilities and Data trace to Must behavior.
- Responsibility Placement follows from behavior and constraints.
- Interfaces preserve the agreed behavior, errors, privacy, and consistency.
- Hard-to-reverse trade-offs are resolved; deferred and out-of-scope work are
  explicit.

Do not call `/requirements-to-spec` while a required readiness item is merely
assumed. Create or continue a decision ticket instead.

## Ticket and resolution context

Keep Wayfinder's minimal `## Question` interface. Add only useful context, not
ceremonial empty fields. Downstream technical questions should normally cite
their upstream decisions. Resolution comments should make the decision,
traceability, rejected alternatives, consequences, and newly unlocked
questions recoverable without replaying chat history.

## Avoid

- Do not modify or fork the ordinary Wayfinder workflow for all tasks.
- Do not pre-create one ticket for every item in the traceability spine.
- Do not rewrite a candidate feature as a fabricated User Job.
- Do not use a flat story list as a substitute for an end-to-end story map.
- Do not let infrastructure convenience silently weaken a Must Use Case.
- Do not place capabilities or data before identifying why they are required.
- Do not produce implementation tickets; the map ends at an accepted spec.
