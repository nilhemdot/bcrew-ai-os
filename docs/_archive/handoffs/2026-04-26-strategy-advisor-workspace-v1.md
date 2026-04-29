# 2026-04-26 Strategy Advisor Workspace V1 Handoff

## Scope Closed

Steve said the Strategy Advisor bubble was too small and slow-feeling for tomorrow's strategy session. The live-use card was `STRATEGY-007`: build a full-screen Strategy Advisor workspace, preserve the quick launcher, add Fast/Deep modes, save the local thread, and show route/model/latency.

This is now shipped for v1.

## What Changed

- `/strategic-execution#advisor` now renders a full-screen `Strategy Chat` workspace instead of the old small advisor card.
- The floating Strategy Advisor launcher still exists for quick access.
- Advisor thread state is saved in `sessionStorage` for the browser session and capped to the latest 80 messages.
- The workspace has Fast/Deep mode controls:
  - Fast mode uses a smaller context window and shorter output for live meeting flow.
  - Deep mode uses the larger context and longer output for heavier synthesis.
- The advisor API accepts `mode: "fast" | "deep"` and returns `mode` plus `latencyMs`.
- UI answer metadata now shows mode, latency, model, provider, and auth path when available.
- Good-prompt buttons remain available, with extra prompts for tomorrow's strategy session.
- `public/strategic-execution.html` cache-bust was advanced to `20260426c`.

## Direct Artifact Fix

Steve live-tested a Ryan pre-strat question and exposed a real failure: the advisor had the packet summary but not enough exact artifact text to answer "what did Ryan say?" The first fix added direct artifact search to the advisor context, but Fast mode initially truncated it behind the packet JSON. The final fix moves direct artifact search to the top of the context and narrows pre-strat questions to Drive artifacts first.

A second issue was also found: Ryan's Q2 pre-strat PDF was a fillable PDF. `pdftotext` extracted the visible template but missed the completed form fields. `scripts/extract-drive-content.mjs` now extracts PDF form fields with `pdf-lib` and records `drive_pdf_pdftotext_form_fields_v1` plus `pdfFormFieldsUsed=true`.

The pre-strat PDF set was force-reprocessed. Current Drive proof is now `40` artifacts / `713,744` chars. Ryan's PDF now includes his filled answer, including the line that he loves social media and helping agents sign clients but "absoultey hate[s]" going over numbers, calling people out for slow lead response, and call expectations.

## Backlog / Docs Updated

- Live DB and seed now mark `STRATEGY-007` as `done`.
- `STRATEGY-004` remains the next strategy build: review/promote controls for accepting, rejecting, asking for more evidence, and promoting packet items into quarterly priorities, decisions, backlog, and Action Router records.
- `docs/rebuild/current-plan.md` and `docs/rebuild/current-state.md` now describe the full-screen workspace and Fast/Deep modes as shipped.
- `docs/source-notes/google-drive-corpus.md` now records PDF form-field extraction and updated Drive artifact counts.
- `scripts/foundation-verify.mjs` now checks for the advisor workspace, saved local thread, Fast/Deep API mode support, latency metadata, direct artifact search, and PDF form-field extraction.

## Verification

- `node --check public/strategic-execution.js` passed.
- `node --check server.js` passed.
- `node --check scripts/foundation-verify.mjs` passed.
- `curl http://localhost:3000/strategic-execution` showed the new JS cache-bust and preserved floating launcher.
- Advisor validation route returned the expected `strategy_advisor_question_required` error for an empty request.
- Dashboard LaunchAgent was restarted after server route changes.
- A live Fast advisor call against Ryan's pre-strat question succeeded and used `Ryan PreStrat Doc 2.0_fillable (3).pdf` directly.
- `npm run -s foundation:verify` passed `77/77` after the build.

## Next

1. Open `/strategic-execution#advisor` in the browser and test one Fast question plus one Deep question.
2. If the workspace feels good enough for tomorrow, move to `STRATEGY-004`.
3. `STRATEGY-004` should add packet-item review/promote controls:
   - accept
   - reject
   - needs evidence
   - promote to quarterly priority
   - promote to decision
   - promote to backlog
   - later: Action Router handoff
