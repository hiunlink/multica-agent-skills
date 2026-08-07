# Domain Docs

Record how skills consume this repository's domain language and durable
decisions.

## Required contract

- Name the glossary source, commonly root `CONTEXT.md` or `CONTEXT-MAP.md`.
- Name accepted ADR and architecture-document locations.
- Distinguish accepted decisions from draft RFCs and planning documents.
- Require issue titles, specs, tickets, tests, and implementation language to
  use canonical glossary terms.
- Surface conflicts among code, glossary, and accepted decisions instead of
  silently choosing one.
- Keep implementation plans, roadmaps, and task state out of domain glossaries.

Create missing glossary or ADR files lazily, only when a term or durable
decision is actually resolved.
