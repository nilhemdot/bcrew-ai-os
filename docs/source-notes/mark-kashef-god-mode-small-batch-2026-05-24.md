# Mark Kashef God Mode API Full-Watch Small Batch

Generated: 2026-05-25T04:01:47.445Z
Card: `MARK-KASHEF-LAST-50-BASELINE-001`
Report artifact: `batch:mark-kashef-last-50:api-full-watch-small-batch-v1`
Status: `ready_for_director_resynthesis`
Model: `gemini-3.5-flash`

## Plain-English Summary

The system watched 1 public Mark Kashef videos through the Gemini API video/audio/visual route, read the YouTube page evidence, classified resource links, and kept every recommendation proposal-only.

## Videos

- Claude Code's Document Skills Are an UNFAIR ADVANTAGE (F6JTJ9GeSOY)
  - URL: https://www.youtube.com/watch?v=F6JTJ9GeSOY
  - Visual evidence: 3; build candidates: 2; tokens: 110908

## Top Build Candidates

- AIOS Custom Skills Directory Injector
  - Source video: Claude Code's Document Skills Are an UNFAIR ADVANTAGE
  - Why: Automates the injection of Anthropic's document skills (XLSX, PPTX, PDF) into the local .claude/skills directory of any workspace.
  - Next: Create a workspace setup script that clones the Anthropic skills repo and maps them to the correct local directory.
  - Evidence: 01:40, 04:28
- Zero-Shot Brand-Aligned Document Generator
  - Source video: Claude Code's Document Skills Are an UNFAIR ADVANTAGE
  - Why: Combines Firecrawl's branding extraction API with Claude Code's PDF/PPTX generation skills to create instantly styled corporate documents.
  - Next: Build an agent tool that takes a URL, calls Firecrawl's branding endpoint, and passes the resulting JSON to the document generation prompt.
  - Evidence: 08:50, 09:50

## Boundaries

- Do not run the full Mark last-50 from this small batch.
- Do not use Gemini Workspace/subscription URL-scout output as full video watching.
- Do not crawl Skool, MyICOR, Gumroad, Calendly, comments, members, private, paid, auth-required, course, or community sources.
- Do not purchase, download, opt in, book, submit forms, mutate credentials, mutate browser profiles, or write externally.
- Do not work MEETING-VAULT-ACL-001 Phase B, mutate Drive permissions, or send request-access emails.
- Do not auto-create backlog cards from recommendations.
- Do not store raw video or screenshot bytes in git.

## Checks

- PASS batch size is guarded at 3-5 videos or final tail - 1 final-tail
- PASS all videos come from the Mark Kashef Foundation pool - F6JTJ9GeSOY:mark-kashef
- PASS one-video seed is not reprocessed in the small batch - F6JTJ9GeSOY
- PASS public YouTube page evidence captured for every video - F6JTJ9GeSOY:true
- PASS Gemini API full-watch result exists for every video - gemini-3.5-flash:true
- PASS every video has timestamped visual evidence - gemini-3.5-flash:3
- PASS every video has build candidates - gemini-3.5-flash:2
- PASS batch produced ranked build candidates - 2
- PASS safe resource follows are read-only metadata only - 0

