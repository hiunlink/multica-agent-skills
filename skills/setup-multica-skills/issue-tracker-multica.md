# Issue Tracker: Multica

Issues and specs for this repository live in Multica. Use the `multica` CLI and
request JSON output when a command supports it.

## Basic operations

- Verify access with `multica auth status` before mutation.
- Read an issue with `multica issue get <key> --output json`, then read comments
  with `multica issue comment list <key>`.
- List children with `multica issue children <key>` when supported. Otherwise,
  paginate `multica issue list --output json` and filter `parent_issue_id`.
- Create with `multica issue create --title "..." --description-stdin --status
  <status> --output json`; add `--parent <key>` for a child.
- Update long bodies with `multica issue update <key> --description-stdin`.
- Add multiline comments with `multica issue comment add <key>
  --content-stdin`.
- Use `done` for resolved work and `cancelled` for intentionally abandoned or
  out-of-scope work. Do not delete historical planning issues.

Write tracker content in the user's or repository's working language. Preserve
proper nouns, issue keys, CLI/API names, and code identifiers.

## Publication and assignment

- Publish specs as unassigned `backlog` planning artifacts.
- Publish executable tickets as `todo` only when blockers are resolved and the
  execution contract is complete; otherwise use `backlog` or `blocked`.
- Assigning an agent can enqueue a run. Never assign merely to record a
  recommendation or passive claim.

## Blocking

Multica does not currently expose native dependency edges. The ticket body's
`## Blocked by` section is the only source of truth:

```markdown
## Blocked by

- [<ticket title>](<ticket URL>) (`MUL-123`)
```

Use `None - can start immediately` for no blockers. A ticket is unblocked only
when every referenced blocker is `done`. A cancelled blocker requires the
dependent ticket to be revisited, reshaped, or cancelled.

## Wayfinding operations

- Map: unassigned `in_progress` issue labelled `wayfinder:map`.
- Child ticket: use `--parent <map-key>` and exactly one type label from
  `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or
  `wayfinder:task`.
- Frontier: open children with no assignee and no non-`done` blocker, preserving
  child order.
- HITL claim: assign to the participating human, or mark `in_progress` when the
  current interactive session cannot safely resolve that member.
- AFK claim: assign the intended agent only when its run should start; keep
  premature work in `backlog`.
- Resolve: add one resolution comment, set `done`, and append only a named link
  plus one-line gist to the map's Decisions so far.
- Out of scope: record the reason, set `cancelled`, and link it under the map's
  Out of scope section rather than Decisions so far.
