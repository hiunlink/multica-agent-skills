---
name: handoff
description: Compact the current conversation into a temporary handoff document for another agent or fresh session. Use when context is near its limit, work must pause, or the user asks another agent to continue.
argument-hint: "What will the next session be used for?"
---

# Handoff

Write a handoff document summarizing the current conversation so a fresh agent
can continue without reconstructing context.

- Save it in the operating system's temporary directory, not the workspace.
- Link to existing issues, specs, ADRs, commits, diffs, and files instead of
  duplicating their contents.
- Record settled decisions, unresolved questions, current blockers, changed
  files, verification already run, and the exact next action.
- Include a Suggested skills section with only skills relevant to the next
  session.
- Preserve warnings about uncommitted or concurrent work.
- Redact credentials, tokens, personal data, and other sensitive information.
- If the user supplied a target for the next session, optimize the handoff for
  that target.

Return the handoff path and a one-sentence description of what the next agent
should do first.
