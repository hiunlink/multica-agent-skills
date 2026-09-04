---
name: story-mapping
description: Guide the user through decomposing a broad Spec into Activities and User Task/User Story cards, then generate an offline static Story Map for the user to arrange before to-tickets.
disable-model-invocation: true
---

# Story Mapping

Turn a broad product Spec into a context-preserving Story Map draft and an
offline arrangement artifact. The agent helps discover and split the cards;
the user owns the arrangement, priority, and Release decisions.

This skill is a preparation and arrangement workflow. It is not a replacement
for requirements discovery, product prioritization, vertical ticket slicing, or
implementation planning.

## Boundary with neighboring skills

Use this skill when the product behavior is broad enough that a flat backlog
would lose context or make the first release difficult to choose.

```text
accepted Spec with broad/unclear scope
  -> /story-mapping
  -> user arranges the generated map
  -> story-map.json with an accepted selectedRelease
  -> /to-tickets
```

Keep these responsibilities separate:

- `/requirements-wayfinder` establishes Product Outcomes, Actors, User Jobs,
  story-map coverage, priorities, Use Cases, contracts, and architecture
  decisions.
- `/requirements-to-spec` or `/to-spec` records an accepted Spec.
- `/story-mapping` decomposes the Spec into map-ready product cards and creates
  the arrangement artifact. It must not choose the user's MVP or Release.
- Product Release selection is performed by the user through Story Map
  arrangement; no separate Release-slicing skill is required.
- `/to-tickets` consumes the Spec as before. An accepted `story-map.json` is an
  optional scope-and-context supplement; its `selectedRelease` narrows the
  cards ticketized.
- `/implementation-plan` plans one already-approved ticket.

A small, coherent Spec can skip this skill and go directly to `/to-tickets`.

## Human-owned decisions

The agent may suggest groupings, card splits, a narrative order, and warnings.
The user decides or explicitly confirms:

- whether an Activity belongs on the map;
- whether a candidate card is correctly split;
- the left-to-right Activity order;
- card order within an Activity;
- priority and Release lanes;
- what is deferred, excluded, or selected for ticketing;
- when the arrangement is ready for `/to-tickets`.

Never infer a Release, MVP, Must/Should/Could/Won't priority, or selected lane
from words such as "important", "required", or `Must` in the eventual product
Spec. Those labels describe the product panorama unless the user explicitly
assigns them to a Release in the arrangement.

## Inputs and source authority

Read the complete accepted Spec or the user-provided authoritative source. Also
read linked accepted decisions, the repository glossary, relevant ADRs, and
implementation constraints when they affect the card wording or traceability.

If the source does not establish an Actor, User Job, behavior, or scope needed
to form a card, report the gap and ask a focused question. Do not invent a user
need from a feature name or turn an unresolved requirement into a confirmed
card.

The map is a derived planning artifact. Preserve source references on every
Activity and Story Map card so that the map can be regenerated or corrected
without silently changing the Spec.

## Splitting model

Use the following levels and keep them visibly distinct:

```text
Product Outcome / User Job
  -> Activity (backbone; broad user activity)
      -> User Task or User Story (a concrete user-observable step/outcome)
```

An Activity is a large thing a person does to make progress and may contain
many steps. It is context, not an implementation ticket. A User Task/User Story
is small enough to discuss, prioritize, and place on a map, but it is still a
product behavior rather than a developer task.

### Card rules

A candidate User Task/User Story should normally have:

- one primary Actor;
- one user goal or observable outcome;
- a clear relationship to one Activity;
- enough context to explain why it matters;
- a source reference to the Spec, Use Case, contract, or decision;
- a success observation, with relevant failure/degradation behavior recorded;
- no commitment to a module, API, database, vendor, or technical layer.

Use a short label for the map and, where useful, a full statement:

```text
Short label: Run a fixed Scenario
Story: As an evaluator, I want to run a versioned Scenario against a fixed
Context, so that I can reproduce and compare Agent behavior.
```

Do not force every card into formal "As a ..." grammar when a concise User Task
is clearer. The card must still identify its Actor, goal, and outcome in its
metadata.

### How to split

Split when a card contains any of the following:

- two independently valuable outcomes joined by "and";
- different primary Actors;
- separate triggers or completion signals;
- alternatives that a user may choose independently;
- behavior that could be placed in different Release lanes;
- a user-observable step that can be reviewed without the other behavior.

Do not split merely because implementation has several layers. A UI, service,
database, and test for one behavior remain one product card and later become
part of one or more vertical tickets.

Keep a parent Activity when its children are produced. Never replace the
backbone with only the leaves. Record implementation or data implications as
notes and source context, not as fake User Stories.

### Failure and non-happy paths

Attach relevant failure, safe-degradation, permission, privacy, and recovery
behavior to the card that owns the user goal. Create a separate card only when
the failure/recovery behavior is itself a distinct user outcome or a separate
Release decision. Do not generate a separate card for every error code.

### Map-quality checks

Before generating the page, inspect the draft for:

- an understandable left-to-right end-to-end narrative;
- missing transitions between Activities;
- an Activity that is actually a technical component;
- a card that still contains multiple outcomes or is really an Epic/Activity;
- cards with no Actor, outcome, or source reference;
- selected behavior that would not form a complete user-visible path (warn only
  at this stage; the user owns the decision);
- cards that are duplicates or overlap another card;
- unresolved questions that should remain visible rather than be hidden in a
  card.

These checks produce warnings and questions. They do not silently prioritize,
remove, or rearrange cards.

## Guided process

### 1. Establish the map's source and destination

State the source Spec and explain that the output is a draft Story Map for
human arrangement, not a Release plan or ticket list. Confirm the primary
Actor/User Job if the source contains more than one plausible journey.

### 2. Build the backbone breadth-first

Propose the smallest useful set of Activities that lets someone narrate the
whole product behavior from beginning to end. Show source references and any
uncertainty. Ask the user to correct, merge, split, or rename Activities before
expanding every card beneath them.

The order at this stage is a **suggested narrative order**, not an accepted
priority or implementation order. The user must be able to change it in the
page.

### 3. Decompose one Activity at a time

For each accepted Activity:

1. propose User Task/User Story cards;
2. explain the split boundaries and any cards that may still be too broad;
3. include relevant success and failure/degradation notes;
4. show source traceability;
5. ask whether cards are missing, overlapping, too coarse, or too fine.

Do not dump a large flat list and ask for a single approval. Iterate in
Activity-sized batches so the user can shape the vocabulary and boundaries.

### 4. Review the complete draft

Present the complete hierarchy:

```text
Activity A
  - Card A1
  - Card A2
Activity B
  - Card B1
```

Ask only the remaining focused questions needed to make the map coherent. Do
not ask the user to select Release lanes in this conversational step; that is
the purpose of the static page.

After every confirmed conclusion—backbone structure, Activity name/order, or a
card split—update the same static map artifact. Do not wait for the entire map
to be complete. The first artifact may contain only the confirmed backbone and
empty card areas. Later updates must preserve stable IDs and any user
arrangement already imported; never silently reset an arrangement while adding
new cards.

### 5. Generate or update the offline Story Map page

Create or update a self-contained HTML file after each confirmed conclusion. It
must work when opened directly from the filesystem and must not require a web
server, external assets, a CDN, or a network request.

The page should provide:

- Activity columns with their suggested narrative order;
- an unarranged area and user-created or pre-created Release lanes;
- drag-and-drop movement of cards between Activities and lanes;
- reordering of Activities and cards;
- card detail display for Actor, User Job, outcome, failure/degradation notes,
  dependencies, and source references;
- editing of arrangement metadata without changing the authoritative Spec;
- explicit `Draft` and `Ready for to-tickets` states;
- JSON export and import;
- Markdown export for human review;
- a reset-to-generated-draft action;
- local persistence where supported, while treating downloaded JSON as the
  canonical save mechanism.

The page's initial layout may use the suggested Activity order and an
Unarranged lane. It must not preselect a Release or assign priority. If the
page offers default lane names such as `Unarranged`, `Release 1`, `Later`, and
`Out of scope`, those are organizational affordances only; cards remain
unassigned until the user moves them.

Because a `file://` page's browser storage behavior can vary, never rely on
local storage as the only persistence mechanism. Tell the user to export the
JSON after arranging and provide an import control for continuing later.

### 6. Accept the arrangement and hand off

When the user returns an exported JSON or asks to hand it off:

- validate the source reference;
- verify that the user explicitly marked the arrangement accepted;
- verify that `selectedRelease` names an existing lane;
- ensure every selected card has an Activity, stable ID, Actor/outcome, and
  source reference;
- preserve deferred, out-of-scope, and unarranged cards in the exported map;
- warn about gaps in end-to-end coverage without deciding for the user;
- pass the Spec plus the accepted `story-map.json` to `/to-tickets`.

Do not publish tickets from this skill. `/to-tickets` still quizzes the ticket
granularity and owns tracker publication.

## `story-map.json` contract

JSON is the canonical machine-readable export. Markdown is a review view and
must not be the only handoff format.

Use this shape (additional display-only fields are allowed, but must not
change the meaning of the required fields):

```json
{
  "schemaVersion": 1,
  "mapId": "<stable map identifier>",
  "title": "<map title>",
  "source": {
    "type": "multica-issue | file | url | conversation",
    "ref": "<Spec/Issue/path/URL reference>"
  },
  "arrangementStatus": "draft | accepted",
  "selectedRelease": "<lane id> | null",
  "lanes": [
    {
      "id": "unarranged",
      "title": "Unarranged",
      "kind": "unarranged | release | later | out-of-scope",
      "order": 0
    }
  ],
  "journeys": [
    {
      "id": "<stable journey id>",
      "title": "<journey title>",
      "actor": "<primary actor>",
      "userJob": "<job served>",
      "order": 0,
      "sourceRefs": ["<source locator>"]
    }
  ],
  "activities": [
    {
      "id": "<stable activity id>",
      "journeyId": "<journey id>",
      "title": "<activity title>",
      "description": "<context>",
      "order": 0,
      "sourceRefs": ["<source locator>"]
    }
  ],
  "cards": [
    {
      "id": "<stable card id>",
      "activityId": "<activity id>",
      "cardType": "user-task | user-story",
      "shortLabel": "<map label>",
      "story": "<optional full user-story statement>",
      "actor": "<primary actor>",
      "userJob": "<job served>",
      "benefit": "<why the outcome matters>",
      "trigger": "<optional trigger>",
      "observableOutcome": "<observable result>",
      "successBehavior": "<success behavior>",
      "failureBehavior": "<relevant failure/degradation behavior>",
      "extensions": {},
      "sourceRefs": ["<source locator>"],
      "dependsOn": ["<card id or semantic dependency>"],
      "laneId": "unarranged",
      "order": 0
    }
  ]
}
```

Contract rules:

- `schemaVersion` is required and must be supported by the consuming skill;
- `source` identifies the Spec that remains the primary requirements source;
- `arrangementStatus` must be `accepted` before the JSON narrows
  `/to-tickets` scope;
- `selectedRelease` must be a lane ID when `arrangementStatus` is `accepted`;
- only cards whose `laneId` equals `selectedRelease` are in the automatic
  ticketing scope;
- `journeyId` keeps parallel Actor journeys separate without turning an
  implementation role into a product journey;
- Activity and card `order` values describe the user's arrangement, not
  implementation order;
- `extensions` is a namespaced escape hatch for project/domain metadata. The
  generic skill preserves extension values and does not interpret or require
  them; the current project's Story Mapping profile defines any extension
  schema and validation rules;
- `dependsOn` expresses product/map context. `/to-tickets` must validate any
  execution blocker instead of treating every map dependency as a ticket
  blocker;
- cards in other lanes, `unarranged`, `later`, and `out-of-scope` remain part
  of the panorama but are not ticketized for the selected Release;
- no card may silently lose its `sourceRefs` during export.

The Markdown export should clearly show the source, arrangement status,
selected Release, ordered Activities, cards in each lane, unarranged cards,
deferred/out-of-scope cards, and unresolved warnings. It is for review and
conversation; `/to-tickets` should prefer JSON.

## Handoff to `/to-tickets`

Tell the user to provide both the accepted Spec and the exported JSON. The
normal Spec-only invocation remains valid. With JSON, `/to-tickets` should:

1. read the complete Spec as the requirements authority;
2. validate the JSON source and accepted arrangement;
3. limit product-scope drafting to `selectedRelease` cards;
4. retain Activity context, card order, source references, and map dependencies;
5. convert the selected product behavior into independently verifiable
   vertical tickets;
6. ask the user whether the ticket granularity and blocking edges are right;
7. publish only after the normal `/to-tickets` approval and tracker checks.

If the JSON is malformed, refers to a different source, has a draft
arrangement, or lacks a selected Release, stop and ask for correction or an
explicit Spec-only workflow. Never silently fall back to ticketizing the whole
panorama when the user intended the JSON to narrow it.

## Avoid

- Do not decide the MVP, Release, priority, or arrangement for the user.
- Do not flatten the map into an unordered feature backlog.
- Do not delete Activities after decomposing them.
- Do not turn technical layers into User Stories.
- Do not make every error code a separate card.
- Do not treat every map card as a ticket.
- Do not publish Multica tickets from this skill.
- Do not replace the accepted Spec with the exported map; the map narrows and
  contextualizes scope, while the Spec remains authoritative for requirements.
- Do not depend on a web server, external JavaScript, or browser storage alone.
