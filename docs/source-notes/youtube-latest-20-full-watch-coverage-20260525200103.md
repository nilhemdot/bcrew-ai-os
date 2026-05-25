# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T20:01:03.903Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525200103`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 1 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Jack / Itssssss_Jack: Top 5 Claude Code Skills... 100,000+ github stars (WR-kVYU-lBU)
  - URL: https://www.youtube.com/watch?v=WR-kVYU-lBU
  - Visual evidence: 3; build candidates: 2; tokens: 123855
  - Resource links: 4 resolved public; 11 blocked; 0 still queued

## Top Build Candidates

- Interactive Codebase Knowledge Graph Visualizer
  - Source: Jack / Itssssss_Jack - Top 5 Claude Code Skills... 100,000+ github stars
  - Why: Improves developer onboarding and agent context retrieval by mapping codebases into queryable, visual semantic clusters.
  - Next: Implement a tree-sitter parser to generate interactive D3.js force-directed graphs from local repositories.
  - Evidence: 00:26, 01:35
- Task-Based LLM Router Proxy
  - Source: Jack / Itssssss_Jack - Top 5 Claude Code Skills... 100,000+ github stars
  - Why: Reduces API costs by up to 80% by routing simple tasks to cheap models and reserving expensive models for reasoning.
  - Next: Build a local proxy server that mimics the Anthropic API and routes requests to OpenRouter based on prompt classification.
  - Evidence: 17:23, 19:54

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 1/9
- PASS all videos are non-Mark public creator selections - WR-kVYU-lBU:jack-itssssss
- PASS public YouTube page evidence captured for every video - WR-kVYU-lBU:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - WR-kVYU-lBU:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - WR-kVYU-lBU:0
- PASS batch produced ranked build candidates - 2

