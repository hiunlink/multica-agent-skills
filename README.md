# Multica Agent Skills

Multica-first planning and execution skills for coding agents.

This collection builds on Matt Pocock's Wayfinder workflow and adapts its issue
tracker contract to Multica. Its workflow starts with the smallest useful route:

- `agent-task-intake`: route ambiguous, risky, or long-running work.
- `issue-workspace`: preserve one small unresolved discussion.
- `wayfinder`: map and resolve a multi-session field of decisions.
- `to-spec`: synthesize settled decisions into a durable spec.
- `to-tickets`: produce executable vertical slices with explicit blockers and
  execution contracts.
- `handoff`: transfer live context to another agent or fresh session.
- `improve-codebase-architecture`: find deepening opportunities and resolve a
  selected candidate with `codebase-design`, `grilling`, and `domain-modeling`.

## Install

Install all skills for OpenCode:

```bash
npx skills add hiunlink/multica-agent-skills \
  --skill '*' --agent opencode --copy --yes
```

Add `--global` to install at user scope rather than in the current project.

Install only the core workflow:

```bash
npx skills add hiunlink/multica-agent-skills \
  --skill agent-task-intake setup-multica-skills issue-workspace wayfinder \
  to-spec to-tickets handoff \
  --agent opencode --copy --yes
```

Restart the agent runtime after installation so it reloads skill definitions.

## Setup

Run `/setup-multica-skills` once in each repository. It writes the repository's
tracker and domain-doc contracts under `docs/agents/` and adds a short pointer
to the existing `AGENTS.md` or `CLAUDE.md`.

The setup expects:

- an authenticated `multica` CLI;
- a selected Multica workspace;
- issue labels for Wayfinder maps and ticket types.

## Project-owned configuration

The global skill repository owns templates and setup behavior. Each consuming
repository owns the generated instances:

- the `## Agent skills` pointer in its `AGENTS.md` or `CLAUDE.md`;
- `docs/agents/issue-tracker.md` with its workspace and CLI conventions;
- `docs/agents/domain.md` with its actual glossary and decision sources;
- any project context skill containing repository-specific paths and rules.

Do not centralize those generated files: another repository may use a different
Multica workspace, domain layout, language, or architecture baseline.

## Multica model

Multica parent/child issues represent maps and tickets. Because Multica does not
currently expose native dependency edges, each ticket's `## Blocked by` section
is the single dependency source of truth. Agent assignment is an execution
operation, not passive metadata, so skills avoid assigning an agent until work
should actually start.

## Upstream

Selected skills are derived from
[`mattpocock/skills`](https://github.com/mattpocock/skills). See
[`UPSTREAM.md`](UPSTREAM.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)
for provenance, local changes, and license notices.

## License

MIT. Upstream-derived files retain Matt Pocock's MIT terms as recorded in
`THIRD_PARTY_NOTICES.md`.
