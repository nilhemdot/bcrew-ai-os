# CLAUDE.md - Workspace Bootstrap

Canonical workspace instructions live in `AGENTS.md`. This file exists so Claude Code loads the same workspace doctrine instead of starting blank.

Before answering or choosing work:

1. Run `npm run builder:startup-packet` from `/Users/bensoncrew/bcrew-ai-os` and use the live packet as current sprint/source/backlog truth.
2. Read `AGENTS.md` and follow it fully, including the private-memory boundary.
3. If the startup packet fails, say so and fall back to the file startup sequence in `AGENTS.md`.

Do not copy private memory, secrets, or local-only files into tracked docs.
