---
name: issue-workspace
description: Manage one small unresolved discussion or blocked decision in Multica. Use when the topic needs a durable parking place but is not large enough for Wayfinder and is not ready for to-spec or to-tickets.
---

# Issue Workspace

Use one Multica issue to preserve or resume a bounded unresolved discussion.
Read `docs/agents/issue-tracker.md` before tracker operations.

## Boundaries

- Use `/wayfinder` for multiple dependent decisions, material fog, or work that
  will exceed one agent session.
- Use `/to-spec` when goals, scope, and decisions are mature.
- Use `/to-tickets` when accepted decisions need executable vertical slices.
- Do not mutate Multica unless the user asks to persist or update.

## Issue body

```markdown
## Type

discussion / spec-candidate / adr-candidate / blocked

## Context

...

## Confirmed

...

## Unresolved

...

## Decisions

...

## Next step

...

## Related

- Issue:
- Docs:
- Branch:
```

Use Multica status for lifecycle rather than duplicating state in the body:
`backlog`, `todo`, `in_progress`, `blocked`, `done`, or `cancelled`.

## Workflow

1. Synthesize without inventing commitments.
2. Separate confirmed facts, open questions, decisions, blockers, and next step.
3. Recommend Wayfinder instead if several decision tickets are already visible.
4. Present the draft unless the user explicitly requested immediate creation.
5. Create an unassigned issue and return its key, URL when available, status,
   and next action.

When resuming, read the issue and comments, summarize current state, and continue
without mutation by default. Promote to Wayfinder, spec, tickets, or ADR only
when the corresponding boundary is reached.
