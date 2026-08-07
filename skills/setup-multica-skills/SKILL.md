---
name: setup-multica-skills
description: Configure a repository for Multica-first planning skills by writing its issue-tracker and domain-doc contracts. Run once before using issue-workspace, wayfinder, to-spec, or to-tickets in a new repository.
disable-model-invocation: true
---

# Setup Multica Skills

Configure the repository contracts consumed by this collection.

## Explore

Read the repository before writing:

- `AGENTS.md` or `CLAUDE.md` at the root.
- Existing `docs/agents/issue-tracker.md` and `docs/agents/domain.md`.
- Root `CONTEXT.md` or `CONTEXT-MAP.md`.
- Accepted ADR or architecture-document locations.
- `multica version`, `multica auth status`, and the selected workspace.
- Existing labels named `wayfinder:*`.

Preserve existing repository guidance. Ask only when the tracker choice, domain
layout, or target workspace is genuinely ambiguous.

## Write

1. Create `docs/agents/issue-tracker.md` from
   [issue-tracker-multica.md](./issue-tracker-multica.md), adapting language and
   CLI compatibility notes to the repository.
2. Create `docs/agents/domain.md` from [domain.md](./domain.md), recording the
   repository's actual glossary and accepted-decision locations.
3. Add or update one compact `## Agent skills` section in the existing
   `CLAUDE.md`, otherwise `AGENTS.md`. Do not create the other file when one
   already exists.
4. Ensure these workspace labels exist, reusing existing labels rather than
   duplicating them:
   - `wayfinder:map`
   - `wayfinder:research`
   - `wayfinder:prototype`
   - `wayfinder:grilling`
   - `wayfinder:task`

Show the proposed repository-specific docs before writing when setup choices
remain unresolved. Never overwrite unrelated instructions.

## Agent skills block

```markdown
## Agent skills

### Issue tracker

Planning maps, specs, and execution tickets live in Multica. See
`docs/agents/issue-tracker.md`.

### Domain docs

Use the repository's configured glossary and accepted decision sources. See
`docs/agents/domain.md`.
```
