# MARKETING-VIDEO-LAB-001 Marketing Video Lab Plan

Status: proposal / scope only. Not approved. Do not implement from this file until Steve explicitly promotes it into live backlog and clears main-session coordination.

Hub: `marketing`

Proposed card: `MARKETING-VIDEO-LAB-001`

## Plain-English Decision

Build a small Marketing Video Lab that does what Tanner described: approved assets go in as ingredients, a structured prompt describes the action, and AIOS creates a short on-brand social video draft through Google Veo or FAL.

Do not buy Google Flow / Ultra first.

Reason: the value Tanner wants is not a subscription. The value is an asset-controlled workflow. Google and FAL already expose the same core pattern through APIs we have keys for. Flow may still be useful as a human UI, but it should be the fallback after we prove the internal workflow cannot meet the need.

## What Tanner Already Told Us

Tanner's current workflow:

- He uses Magnific / Freepik because it gives access to many models.
- It is useful, but too broad and inconsistent.
- It burns credits when he tries to force specific details.
- Flow is appealing because it lets him upload individual assets as ingredients.
- Leadership wants social to be more exciting without drifting off-brand.
- The core workflow he wants is: upload assets, add them to the prompt, write the prompt, get an on-brand video.
- His fallback workflow in Magnific is: create start/end static images, upload them, prompt the model to animate between them.

That is enough to scope the MVP. We do not need more examples before planning the build.

## Product Thesis

Marketing does not need another generic AI playground. Marketing needs a constrained production helper that keeps brand assets, prompt structure, provider costs, and review state together.

The first useful version should answer one question:

> Can Tanner create a short on-brand real estate social clip from approved ingredients without fighting generic AI drift?

Example first template:

> Use the mascot, a sold sign, and a listing/home image. Create a vertical social clip where the mascot walks into frame, plants the sold sign in the ground, the camera pushes in, and the result feels like an upbeat Benson Crew sold announcement.

## Research Summary

Current source facts checked on 2026-05-14:

- Google Flow Help says qualifying Workspace users get Flow with limited included credits, while advanced features such as Ingredients to Video are tied to Ultra-level access. Source: https://support.google.com/flow/answer/16353333
- Google Workspace says Flow became available to Workspace Business Starter/Standard/Plus and Enterprise Starter/Standard/Plus users in January 2026. Source: https://workspaceupdates.googleblog.com/2026/01/flow-available-additional-google-service-workspace.html
- Google AI Ultra Access docs describe Flow as the full experience with more credits and advanced features like Ingredients to Video. Source: https://support.google.com/a/answer/16345165
- Gemini API Veo 3.1 docs say the API supports portrait `9:16`, first/last frame generation, video extension, and image-based direction using up to three reference images. Source: https://ai.google.dev/gemini-api/docs/video
- Gemini API pricing lists Veo 3.1 as paid-tier only and priced per generated second by tier/resolution. Source: https://ai.google.dev/gemini-api/docs/pricing
- FAL's Veo 3.1 reference-to-video endpoint accepts a prompt plus `image_urls`, supports `16:9` and `9:16`, duration, resolution, audio toggle, and returns a generated video URL. Source: https://fal.ai/models/fal-ai/veo3.1/reference-to-video/api
- FAL's Veo 3.1 model page describes text-to-video, image-to-video, first/last-frame, reference-to-video, fast, and extension endpoints with per-second pricing. Source: https://fal.ai/models/fal-ai/veo3.1
- Freepik / Magnific docs describe image generation with reference features and the ability to make images into videos, but Tanner's lived issue is that the all-in-one UI is not precise enough for repeatable brand control. Source: https://support.freepik.com/s/article/Freepik-AI-Image-generator

Local environment facts already verified:

- `GOOGLE_AI_API_KEY` is present.
- `FAL_KEY` is present.
- The live Google model list includes:
  - `models/veo-3.1-generate-preview`
  - `models/veo-3.1-fast-generate-preview`
  - `models/veo-3.1-lite-generate-preview`
  - `models/veo-3.0-generate-001`
  - `models/veo-3.0-fast-generate-001`
  - `models/veo-2.0-generate-001`
- The repo already has Marketing source map, Brand Stack, and Avatar Registry doctrine. It does not yet have a live Marketing Hub page on the home screen.

## Strategic Fit In AIOS

This should be a Marketing Hub workflow, not a Foundation feature.

Existing assets to reuse:

- `lib/marketing-avatar-registry.js`
  - carries 15 imported marketing avatars.
- `lib/marketing-source-map.js`
  - maps Benson Crew, Zahnd Team Ag, Steve Zahnd, MarketMasters, and Unchained lanes.
- `lib/brand-stack.js`
  - defines brand boundaries and guardian rules but does not enforce generated content yet.
- `docs/source-notes/freedom-marketing.md`
  - defines marketing pillars, brand lanes, and SocialPilot/publishing separation.
- `docs/process/hub-work-protocol.md`
  - defines hub ownership and coordination rules.
- `docs/process/hub-file-ownership-matrix.json`
  - already has a `marketing` hub lane.

Important architecture read:

- There is no live `/marketing` hub card in `public/index.html` yet.
- Owner access currently only lists `foundation`, `strategy`, `sales`, and `ops` in `public/home.js`.
- Marketing-owned file patterns already exist in the hub matrix:
  - `public/marketing*.html`
  - `public/marketing*.js`
  - `lib/marketing-*.js`
  - `docs/marketing/*`
  - `scripts/*marketing*.mjs`
- Shared or Foundation-owned files require coordination:
  - `server.js`
  - `package.json`
  - `lib/foundation-db.js`
  - `lib/source-contracts.js`
  - `scripts/process-*.mjs`
  - `docs/process/*`
  - `docs/handoffs/*`

Therefore the first build should either:

1. Build a local/admin-only prototype page and API with explicit main-session coordination, or
2. Build hub-owned libraries and static UI first, then coordinate the shared route/storage wiring separately.

## MVP Shape

Name: `Marketing Video Lab`

Primary user: Tanner / Marketing.

Primary job: make short social video drafts from brand-controlled assets.

V1 is not a full marketing pipeline. It does not post, schedule, report performance, or run autonomous campaigns.

V1 has five surfaces:

1. Asset tray
2. Ingredient roles
3. Prompt builder
4. Generate / job status
5. Results ledger

## User Workflow

1. Tanner opens Video Lab.
2. He chooses a template:
   - `Sold sign mascot scene`
   - `Listing reveal`
   - `Agent recruiting hook`
   - `Client education intro`
   - `Custom`
3. He uploads or selects assets:
   - mascot
   - sold sign
   - property / listing image
   - agent photo
   - brand logo / visual element
   - first frame
   - last frame
   - generic reference
4. He tags each asset with a role.
5. The prompt builder produces a structured provider prompt.
6. He chooses provider/mode:
   - `Google Veo 3.1 Fast` for iteration
   - `Google Veo 3.1 Lite` for cheap silent drafts where supported
   - `Google Veo 3.1 Standard` for stronger output
   - `FAL Veo 3.1 Reference to Video`
   - `FAL Veo 3.1 First/Last Frame to Video`
7. The UI shows estimated cost before live generation.
8. He submits the job.
9. AIOS stores the job as pending and polls provider status.
10. The output appears with prompt/assets/provider/cost/review metadata.
11. Tanner marks it:
    - approved
    - rejected
    - retry with note
    - export-ready

## First Template: Mascot Sold Sign

This template should be built first because it exactly matches Tanner's stated example.

Inputs:

- mascot asset
- sold sign asset
- listing/property image
- optional Benson Crew logo/brand asset

Prompt fields:

- action: mascot walks in and plants sold sign
- setting: in front of a recently sold home
- camera: smooth push-in / slight handheld social-video feel
- mood: upbeat, polished, local real estate, not goofy
- brand guardrails:
  - preserve mascot identity
  - preserve sold sign concept
  - do not invent extra logos
  - do not distort text-heavy signs
  - no weird limbs, distorted faces, or chaotic background movement
- output:
  - `9:16`
  - 8 seconds
  - 720p/1080p depending budget
  - audio off by default for cheaper iteration unless Tanner asks for sound

Prompt skeleton:

```text
Create an 8-second vertical social video for Benson Crew real estate.

Use the provided reference images as visual ingredients:
- mascot: keep the mascot recognizable and consistent
- sold sign: use as the central prop, but avoid unreadable or distorted text
- property: use as the setting/background

Scene: the mascot walks into frame in front of the home, plants the sold sign in the ground, steps aside, and the camera smoothly pushes in for a polished sold-announcement moment.

Style: upbeat, clean, realistic branded social content, local real estate marketing, no surreal AI effects.

Camera: stable vertical reel, slight push-in, natural motion.

Avoid: distorted logo/text, extra characters, extra signs, warped mascot, strange limbs, fever-dream backgrounds, fake brokerage claims.
```

## Provider Strategy

V1 should use a provider abstraction, not hardwire the UI to one vendor.

Provider interface:

- `provider`
  - `google-veo`
  - `fal-veo`
- `mode`
  - `text-to-video`
  - `reference-to-video`
  - `image-to-video`
  - `first-last-frame`
  - `extend-video`
- `model`
- `supportsReferenceImages`
- `maxReferenceImages`
- `supportsFirstLastFrame`
- `supportsAspectRatio`
- `supportsAudio`
- `costEstimate`
- `buildPayload(job)`
- `submitJob(job)`
- `pollJob(providerJobId)`
- `downloadOrAttachOutput(result)`

Recommended default:

- First-pass drafts: FAL Veo 3.1 Fast reference-to-video or Google Veo 3.1 Lite/Fast, depending mode support.
- Better output: Google Veo 3.1 Standard or FAL Standard.
- Strongest control: first/last-frame mode if reference-to-video still drifts.

Important implementation rule:

- Use dry-run payload builders and mock provider responses by default.
- Do not run a live generation unless Steve explicitly approves a spend limit.

## Cost Controls

AI video can burn money quickly. V1 must make cost visible before generation.

Rules:

- Default to `9:16`, 8 seconds, 720p, audio off for drafts.
- Show estimated range before submit.
- Require confirmation above a configured threshold.
- Store estimated and actual cost.
- Record failed generations separately.
- Never auto-retry live generations without a user click.
- Keep a monthly/job ledger per user/provider.

Default policy:

- Draft mode target: under a few dollars per generation.
- Review mode target: use higher quality only after a draft direction is approved.
- No batch generation in V1.
- No background generation loop.

## Data Model

V1 can start file-backed or DB-backed depending the main builder's current path, but the entity shape should be stable.

`marketing_video_assets`

- `id`
- `label`
- `roleDefault`
- `brandLaneId`
- `sourceType`
  - `upload`
  - `google_drive`
  - `generated_static`
  - `external_url`
- `sourceRef`
- `mimeType`
- `sizeBytes`
- `sha256`
- `rightsStatus`
  - `approved`
  - `needs_review`
  - `rejected`
- `rightsNote`
- `uploadedBy`
- `createdAt`

`marketing_video_jobs`

- `id`
- `title`
- `templateId`
- `brandLaneId`
- `status`
  - `draft`
  - `ready`
  - `submitted`
  - `running`
  - `succeeded`
  - `failed`
  - `approved`
  - `rejected`
  - `export_ready`
- `provider`
- `mode`
- `model`
- `promptFields`
- `compiledPrompt`
- `aspectRatio`
- `durationSeconds`
- `resolution`
- `generateAudio`
- `estimatedCostUsd`
- `actualCostUsd`
- `providerJobId`
- `requestedBy`
- `createdAt`
- `updatedAt`

`marketing_video_job_assets`

- `jobId`
- `assetId`
- `role`
- `sortOrder`
- `providerUse`
  - `reference`
  - `first_frame`
  - `last_frame`
  - `image_input`

`marketing_video_outputs`

- `id`
- `jobId`
- `providerOutputUrl`
- `localPath`
- `mimeType`
- `durationSeconds`
- `aspectRatio`
- `resolution`
- `reviewStatus`
- `reviewNote`
- `createdAt`

## Storage Strategy

V1 needs three storage areas:

- uploaded/input assets
- provider-returned videos
- generated job ledger

Preferred staged storage:

1. Local dev/prototype:
   - `store/marketing-video-lab/assets/`
   - `store/marketing-video-lab/outputs/`
   - `store/marketing-video-lab/jobs.json`
2. Durable internal:
   - database tables for jobs/assets/outputs
   - output files still in local or object storage
3. Team asset integration:
   - Google Drive marketing asset folder as source input
   - output export to Drive only after approval

Do not use Drive mutation in V1 unless explicitly approved. Drive can be a later export path.

## API Surface

Potential routes, all admin/auth protected:

- `GET /api/marketing-video-lab`
  - returns templates, provider availability, recent jobs, assets
- `POST /api/marketing-video-lab/assets`
  - accepts upload metadata and stores asset
- `POST /api/marketing-video-lab/jobs/dry-run`
  - compiles prompt and provider payload without spending credits
- `POST /api/marketing-video-lab/jobs`
  - creates or submits a job
- `GET /api/marketing-video-lab/jobs/:id`
  - returns status/output
- `POST /api/marketing-video-lab/jobs/:id/poll`
  - manual poll in V1
- `POST /api/marketing-video-lab/jobs/:id/review`
  - approves/rejects/retry-notes output

Because `server.js` is shared and oversized, API wiring needs main-session coordination. Provider logic should live in Marketing-owned modules, with `server.js` only importing/calling small functions.

## UI Surface

V1 should be practical, not decorative.

Layout:

- left: asset tray and ingredient roles
- center: template and prompt fields
- right: provider settings, cost estimate, job status
- bottom: results ledger

Controls:

- file picker / dropzone for assets
- role select per asset
- template segmented control
- prompt text areas
- aspect ratio segmented control
- provider/model select
- audio toggle
- duration / resolution controls
- dry-run button
- generate button gated by cost estimate
- result review buttons

No marketing landing page. This is a tool surface.

## Brand And Safety Guardrails

V1 must enforce:

- only approved or explicitly reviewed assets can generate;
- human images require rights note before generation;
- no autonomous publishing;
- no text-heavy output promises;
- no claims about sold price, client identity, brokerage, or agent performance unless supplied from source truth;
- no impersonating Steve/agents unless approved;
- all public export remains human-reviewed.

Brand guardrails should use:

- Brand Stack boundary for Benson Crew / Steve / MarketMasters / Zahnd Team Ag;
- negative prompt guidance;
- asset role validation;
- review state before export.

## Build Phases

### Phase 0: Scope Lock

Owner: main session / planning.

Do:

- promote this proposal into live backlog only if Steve says yes;
- name the card `MARKETING-VIDEO-LAB-001`;
- approve exact target files;
- decide prototype storage: local file ledger or DB;
- set default spend limit;
- confirm no live generation without explicit approval.

Do not:

- build UI;
- add routes;
- call providers;
- change nav.

### Phase 1: Dry-Run Tool

Goal: prove the workflow without spending money.

Target files:

- `lib/marketing-video-lab.js`
- `lib/marketing-video-prompts.js`
- `lib/marketing-video-providers.js`
- `scripts/process-marketing-video-lab-check.mjs`

Possible shared files:

- `package.json` only if adding a script;
- `server.js` only if exposing a dry-run API.

Acceptance:

- templates exist;
- asset roles validate;
- prompts compile;
- Google/FAL payload shapes are produced;
- provider availability is detected without printing secrets;
- proof uses synthetic assets and mock provider responses.

### Phase 2: Local Admin UI

Goal: Tanner can assemble a job on screen and run dry-run preview.

Target files:

- `public/marketing-video-lab.html`
- `public/marketing-video-lab.js`
- `public/marketing-video-lab.css`

Shared coordination:

- route registration / static route if needed;
- auth access if exposed outside local dev.

Acceptance:

- upload/select placeholder assets;
- tag roles;
- choose template;
- compile prompt;
- see estimated payload and cost;
- create a draft job in the ledger;
- no live provider spend.

### Phase 3: One Live Generation Gate

Goal: prove the real end-to-end loop with one approved spend.

Precondition:

- Steve approves provider, spend ceiling, model, duration, and asset set.

Acceptance:

- submits one live job;
- polls provider status;
- stores output;
- records provider job id and estimated/actual cost;
- Tanner can approve/reject with notes.

### Phase 4: Marketing Hub Promotion

Goal: make it a real hub surface.

Requires:

- home card/nav decision;
- owner/marketing role access decision;
- storage decision;
- backlog closeout/proof trail;
- no publishing automation yet.

## Target Files

Hub-owned files:

- `public/marketing-video-lab.html`
- `public/marketing-video-lab.js`
- `public/marketing-video-lab.css`
- `lib/marketing-video-lab.js`
- `lib/marketing-video-providers.js`
- `lib/marketing-video-prompts.js`
- `docs/marketing/video-lab/README.md`
- `scripts/process-marketing-video-lab-check.mjs`

Shared / coordinate files:

- `server.js`
- `package.json`
- `lib/foundation-db.js`
- `lib/source-contracts.js`
- `public/index.html`
- `public/home.js`
- `scripts/process-*.mjs`
- `docs/process/*`
- `docs/handoffs/*`

Do not touch without explicit approval:

- `scripts/foundation-verify.mjs`
- Foundation current sprint files
- Foundation build closeout records
- Sales/Ops/Strategy hub files

## Proof Strategy

Proof must test behavior, not string presence.

Focused proof command:

```bash
npm run process:marketing-video-lab-check -- --json
```

Proof checks:

- provider credential detection returns present/missing only, never secrets;
- template registry includes `sold-sign-mascot`;
- synthetic assets validate by role and max count;
- missing required assets fail the sold-sign template;
- prompt compiler includes action, scene, camera, brand guardrails, and negative guidance;
- Google payload builder supports reference images and/or first/last frame payloads;
- FAL payload builder supports `image_urls`, aspect ratio, duration, resolution, audio;
- cost estimator calculates before submit;
- mock submit creates job in `submitted/running/succeeded` lifecycle;
- review state cannot become `export_ready` before output exists;
- live generation path stays disabled unless `--allow-live` or equivalent explicit flag is present.

Hub handoff check:

```bash
npm run process:hub-work-check -- --manifest=<manifest.json> --json
```

Live proof, only with Steve approval:

```bash
npm run process:marketing-video-lab-check -- --json --allow-live --max-cost-usd=<approved amount>
```

## Acceptance Criteria

V1 is done when:

- Tanner can create the mascot sold-sign job from ingredients in AIOS.
- The system supports at least one provider in dry-run and one provider in live generation after approval.
- Every job records assets, roles, compiled prompt, provider, model, mode, output, status, and review note.
- The UI supports `9:16` first.
- Cost is shown before generation.
- Secrets stay server-side.
- Failed generations are preserved.
- Approved outputs are distinguishable from draft/rejected outputs.
- No autonomous posting exists.
- No SocialPilot integration exists.

## Decision Gate: API vs Flow

After Phase 3, decide:

Buy one Flow/Ultra seat only if:

- the API cannot keep the mascot/asset identity stable enough;
- Tanner is materially faster in Flow than in AIOS;
- Flow's ingredient UI produces better results with fewer paid retries;
- the seat cost is cheaper than our expected API iteration waste.

Stay with AIOS if:

- Google/FAL API output is good enough;
- the prompt/assets ledger matters;
- repeatability and review are more important than Google's UI;
- we want provider fallback and cost control.

Keep Magnific only as:

- a benchmark;
- a static-image/start-frame helper;
- a fallback for a model it exposes better than Google/FAL.

## Risks

- Asset identity drift: mitigate with reference-image mode, first/last-frame mode, and negative guardrails.
- Text/sign distortion: treat text-heavy signs as props; do not rely on generated text unless composited later.
- Credit burn: require dry-run first, cost estimate, no auto retry, no batches.
- Provider churn: keep provider interface swappable.
- Slow async jobs: model status as job lifecycle, not a blocking request.
- Rights/consent risk: require rights note on human/brand assets.
- Marketing Hub not live yet: start standalone/local-admin, then promote.
- Shared-file conflict with main builder: declare file ownership and coordinate before code.

## Not Next

- No build until Steve approves implementation.
- No live generation until Steve approves spend.
- No autonomous posting.
- No SocialPilot integration.
- No content calendar.
- No full campaign workflow.
- No Brand Guardian enforcement.
- No broad Marketing Hub rebuild.
- No Foundation verifier mutation unless the card is formally promoted and reviewed.

## Builder Instruction

If this card is approved later, the builder should start with Phase 1 only:

> Build the dry-run Marketing Video Lab core. No live provider calls. No UI unless explicitly approved. Own `lib/marketing-video-*` and `scripts/process-marketing-video-lab-check.mjs`; coordinate before touching `server.js`, `package.json`, DB, nav, or Foundation files. Prove the mascot sold-sign template through synthetic assets, provider payload builders, cost estimation, and mock job lifecycle.

