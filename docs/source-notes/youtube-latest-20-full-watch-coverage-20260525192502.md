# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T19:25:02.429Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525192502`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 1 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Chase AI: Impeccable Just Fixed Claude Code's Biggest Problem (0-AosS67IGU)
  - URL: https://www.youtube.com/watch?v=0-AosS67IGU
  - Visual evidence: 3; build candidates: 2; tokens: 129410
  - Resource links: 1 resolved public; 9 blocked; 0 still queued

## Top Build Candidates

- Design-System-Driven Code Generation (DESIGN.md)
  - Source: Chase AI - Impeccable Just Fixed Claude Code's Biggest Problem
  - Why: Enforces strict design tokens, typography scales, and color palettes before generating frontend code, eliminating generic AI layouts.
  - Next: Create an AIOS agent workflow that generates a DESIGN.md file from user requirements before writing any UI code.
  - Evidence: 05:15, 07:20
- Interactive Browser-to-Code Live Editor
  - Source: Chase AI - Impeccable Just Fixed Claude Code's Biggest Problem
  - Why: Allows developers to click UI elements in the browser and send targeted design commands directly back to the AI agent for instant code updates.
  - Next: Develop a lightweight dev-server injector that captures element selectors and forwards design prompts to the AIOS backend.
  - Evidence: 10:21, 12:28

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 1/9
- PASS all videos are non-Mark public creator selections - 0-AosS67IGU:chase-ai
- PASS public YouTube page evidence captured for every video - 0-AosS67IGU:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 0-AosS67IGU:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 0-AosS67IGU:0
- PASS batch produced ranked build candidates - 2

