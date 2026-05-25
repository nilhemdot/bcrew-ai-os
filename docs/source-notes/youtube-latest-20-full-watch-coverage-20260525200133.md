# YouTube Latest-20 God Mode API Full-Watch Batch

Generated: 2026-05-25T20:01:33.624Z
Card: `YOUTUBE-LATEST-20-FULL-WATCH-RUNNER-001`
Report artifact: `batch:youtube-latest-20:api-full-watch-v1:20260525200133`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 1 public non-Mark creator videos through the Gemini API video/audio/visual route, read YouTube page evidence, resolved safe public resource links, blocked unsafe links, and kept every recommendation proposal-only.

## Videos

- Jono Catliff: 8 Things Your Claude Code App NEEDS Before Making Money (9FH0mG-0fEE)
  - URL: https://www.youtube.com/watch?v=9FH0mG-0fEE
  - Visual evidence: 3; build candidates: 2; tokens: 163281
  - Resource links: 0 resolved public; 27 blocked; 0 still queued

## Top Build Candidates

- AI-Driven RLS Policy Generator
  - Source: Jono Catliff - 8 Things Your Claude Code App NEEDS Before Making Money
  - Why: Secures database tables by automatically generating Row Level Security policies based on tenant context, preventing cross-tenant data leaks.
  - Next: Build a middleware analyzer that parses database schemas and auto-injects tenant-based RLS policies into Supabase/PostgreSQL migrations.
  - Evidence: 08:50
- Stripe Webhook Local Tunneling Automator
  - Source: Jono Catliff - 8 Things Your Claude Code App NEEDS Before Making Money
  - Why: Simplifies testing payment webhooks locally by orchestrating Stripe CLI tunneling and auto-configuring webhook secrets in the local environment.
  - Next: Create an AIOS CLI command that spins up Stripe listen, captures the webhook secret, and automatically appends it to the active .env file.
  - Evidence: 15:42, 17:55

## Boundaries

- Do not run all creators from this card.
- Do not use metadata-only, transcript-only, or subscription scout output as full-watch proof.
- Do not use Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not download videos, purchase, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not auto-create backlog cards from recommendations.

## Checks

- PASS batch size is guarded at 1-9 selected videos - 1/9
- PASS all videos are non-Mark public creator selections - 9FH0mG-0fEE:jono-catliff
- PASS public YouTube page evidence captured for every video - 9FH0mG-0fEE:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2
- PASS resource links are classified and resolver packets exist for every video - 9FH0mG-0fEE:ready_for_scoper
- PASS safe public resource links are resolved or explicitly blocked before scoping - 9FH0mG-0fEE:0
- PASS batch produced ranked build candidates - 2

