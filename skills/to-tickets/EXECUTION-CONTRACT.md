# Execution Contract Gate

Load this gate before publishing a ticket that changes a public contract,
persistence, sync, security, migrations, cross-feature workflows, lifecycle,
or production composition.

Every such ticket must state:

- **Source of truth**: exact committed docs and useful section names or SHA.
- **Exact contract**: fields, methods, states, ownership, ordering, result
  taxonomy, and durability semantics.
- **Non-goals and forbidden shortcuts**: exclusions and invalid substitutes.
- **Cross-operation invariants**: facts preserved across calls, retries,
  restart, recovery, scopes, and projection.
- **Required negative tests**: rejection, partial failure, isolation, retry,
  stale-state, and fail-closed cases appropriate to the boundary.
- **Review gate**: mapping from implementation to contract, non-goals, tests,
  and validation commands.

Unknown wire shapes, state machines, owners, or failure semantics require a
blocking decision/research ticket or `backlog`, not a hidden assumption.

Mocks and fixtures must use one authoritative state for every represented read
and write path unless the issue explicitly defines a fixture-only source.
