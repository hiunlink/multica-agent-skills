# Multica Agent Skills

Multica-first planning and execution skills for coding agents.

This collection builds on Matt Pocock's Wayfinder workflow and adapts its issue
tracker contract to Multica. It separates four kinds of work:

- `issue-workspace`: preserve one small unresolved discussion.
- `wayfinder`: map and resolve a multi-session field of decisions.
- `to-spec`: synthesize settled decisions into a durable spec.
- `to-tickets`: produce executable vertical slices with explicit blockers and
  execution contracts.

## Install

Install all skills:

```bash
npx skills add hiunlink/multica-agent-skills --all
```

Install only the core workflow:

```bash
npx skills add hiunlink/multica-agent-skills \
  --skill setup-multica-skills issue-workspace wayfinder to-spec to-tickets \
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
