# Upstream Provenance

The initial import was selected from `mattpocock/skills` at commit
`84fdeffd12f2ee307994d1eb6feb48173b6e0502` on 2026-08-07.

| Skill | Local policy |
| --- | --- |
| `wayfinder` | Keep its decision-map model close to upstream; delegate tracker semantics to `setup-multica-skills`. |
| `grilling` | Track upstream unless local interoperability requires a change. |
| `domain-modeling` | Track upstream unless local interoperability requires a change. |
| `research` | Track upstream unless local interoperability requires a change. |
| `prototype` | Track upstream unless local interoperability requires a change. |
| `to-spec` | Preserve Multica publication semantics: specs are unassigned planning artifacts. |
| `to-tickets` | Preserve the Multica worktree gate, assignment safety, and execution contract. |
| `handoff` | Derived from upstream; preserve temporary-file, reference-first, and redaction behavior. |
| `agent-task-intake` | Original workflow router maintained in this repository. |
| `codebase-design` | Track upstream as the architecture vocabulary and interface-design dependency. |
| `improve-codebase-architecture` | Track upstream while preserving explicit `grilling`, `domain-modeling`, and `codebase-design` composition. |

## Updating

1. Compare one selected upstream skill at a time against the pinned commit.
2. Review changes instead of merging the entire upstream repository.
3. Preserve the Multica tracker contract and assignment semantics.
4. Update the pinned commit and this table after accepting upstream changes.
5. Re-run skill discovery and reference checks before publishing.
