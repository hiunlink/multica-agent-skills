# Risk Rubric

Use the highest applicable risk level. Risk informs autonomy and route; it does
not automatically require an ADR.

## Low

- One small module or presentation surface.
- No public contract, persistence, auth, permission, payment, or infrastructure
  change.
- Existing patterns and verification are clear.
- Failure is isolated and easy to revert.

Usually route clear work to `execute`.

## Medium

- Crosses several files or modules.
- Changes user-visible behavior, asynchronous behavior, caching, or shared
  error handling.
- Existing patterns are mixed or test coverage is incomplete.
- Rollback is possible but requires care.

Route to `execute` when inspection can establish a bounded contract; otherwise
use `research`, `prototype`, or `issue-workspace` for the specific uncertainty.

## High

- Changes architecture, persistence, migrations, security, auth, permissions,
  payments, deployment, or an external/public contract.
- Introduces a core framework, service, database, queue, or protocol.
- Has data-loss, privacy, compatibility, or hard-to-reverse rollout risk.
- Requires unresolved product or architecture trade-offs.

Use a human decision gate. Route multi-decision uncertainty to `wayfinder` and
only produce executable tickets after the contract is settled.

## Escalators

- Reliable verification cannot run.
- Relevant repository behavior is poorly understood.
- Concurrent sessions may edit the same boundary.
- Requirements, ownership, rollback, or source of truth are unclear.

Feature flags, isolation, reversibility, and strong existing behavioral tests
can reduce execution risk, but they do not erase unresolved decisions.
