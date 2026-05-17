# Harlan Tools: Voice + Fal Image Iteration

Date: 2026-05-17

## Scope

Built two isolated callable tool lanes for Harlan:

- ElevenLabs voice runtime client and proof script
- Fal image edit/iteration client and proof script

No Foundation cleanup, hub features, server routes, auth/security files, process docs, verifier files, or package scripts were changed.

## Files

- `lib/harlan-voice-client.js`
- `lib/fal-image-client.js`
- `scripts/harlan-voice-check.mjs`
- `scripts/fal-image-edit-check.mjs`
- `docs/handoffs/harlan-tools-2026-05-17.md`

Generated proof outputs are local-only under ignored `.openclaw/harlan-tools/`.

## Required Env

Voice:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Optional voice overrides:

- `ELEVENLABS_TTS_MODEL_ID` defaults to `eleven_multilingual_v2`
- `ELEVENLABS_OUTPUT_FORMAT` defaults to `mp3_44100_128`
- `ELEVENLABS_API_BASE_URL` defaults to `https://api.elevenlabs.io`

Fal:

- `FAL_KEY`
- `FAL_API_KEY` is accepted as a fallback if `FAL_KEY` is absent

Credential check on 2026-05-17: required ElevenLabs values and `FAL_KEY` are set in local `.env`. Secret values were not printed.

## Voice Command

Generate a local MP3:

```bash
node --env-file-if-exists=.env scripts/harlan-voice-check.mjs --text="Harlan voice path is live. I can speak through ElevenLabs now."
```

Optionally play it on macOS:

```bash
node --env-file-if-exists=.env scripts/harlan-voice-check.mjs --text="Quick Harlan voice test." --play
```

Callable module path:

```js
import { createHarlanVoiceClientFromEnv } from './lib/harlan-voice-client.js'

const client = createHarlanVoiceClientFromEnv()
await client.synthesizeSpeech({
  text: 'Short Harlan response.',
  outputPath: '.openclaw/harlan-tools/voice/harlan-response.mp3',
})
```

Underlying API path:

- `POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id?output_format=mp3_44100_128`
- Header: `xi-api-key`
- Body: `{ "text": "...", "model_id": "eleven_multilingual_v2" }`

Reference: https://elevenlabs.io/docs/api-reference/text-to-speech/convert

## Fal Image Edit Command

Edit an existing local image:

```bash
node --env-file-if-exists=.env scripts/fal-image-edit-check.mjs --image=state/harlan-epic-1.png --prompt="Refine this existing Harlan concept image. Keep the same character identity and core composition. Improve lighting, facial detail, and command-center polish. Do not regenerate a different character from scratch."
```

Iterate from the prior local result:

```bash
node --env-file-if-exists=.env scripts/fal-image-edit-check.mjs --image=.openclaw/harlan-tools/fal/harlan-fal-edit-2026-05-17T12-25-24-482Z.png --prompt="Keep the same Harlan character. Tighten the expression and make the command center lighting cleaner."
```

Iterate from a Fal result URL:

```bash
node --env-file-if-exists=.env scripts/fal-image-edit-check.mjs --image-url="https://v3b.fal.media/files/..." --prompt="Keep the same character and make a subtle refinement."
```

Callable module path:

```js
import { createFalImageClientFromEnv } from './lib/fal-image-client.js'

const client = createFalImageClientFromEnv()
await client.editImage({
  imagePath: 'state/harlan-epic-1.png',
  prompt: 'Keep the same Harlan character and refine the lighting.',
  outputDir: '.openclaw/harlan-tools/fal',
})
```

Underlying API path:

- `POST https://queue.fal.run/fal-ai/flux-kontext/dev`
- Header: `Authorization: Key $FAL_KEY`
- Header: `X-Fal-Store-IO: 0`
- Body includes `prompt`, `image_url`, `num_inference_steps`, `guidance_scale`, `num_images`, `output_format`, `resolution_mode`
- Poll the returned `status_url`
- Fetch the returned `response_url`

Local file inputs are converted to `data:image/...;base64,...` so Harlan can edit existing local images without first hosting them. Default inline max is 8 MB; for larger images, host the image and use `--image-url` or raise `--max-inline-bytes`.

References:

- https://fal.ai/models/fal-ai/flux-kontext/dev/api
- https://fal.ai/docs/documentation/model-apis/inference/queue
- https://fal.ai/docs/model-apis/payloads

## Tested

Syntax:

```bash
node --check lib/harlan-voice-client.js
node --check lib/fal-image-client.js
node --check scripts/harlan-voice-check.mjs
node --check scripts/fal-image-edit-check.mjs
```

Voice live proof:

- Command succeeded.
- Output: `.openclaw/harlan-tools/voice/harlan-voice-proof-2026-05-17T12-25-02-963Z.mp3`
- Size: 72 KB
- File type: MP3, 128 kbps, 44.1 kHz, mono

Fal live proof:

- Command succeeded.
- Base image: `state/harlan-epic-1.png`
- Endpoint: `fal-ai/flux-kontext/dev`
- Request ID: `019e35e5-ccaa-7440-b131-aa76ab647523`
- Output: `.openclaw/harlan-tools/fal/harlan-fal-edit-2026-05-17T12-25-24-482Z.png`
- Size: 1.4 MB
- File type: PNG, 1024 x 1024
- Payload storage disabled with `X-Fal-Store-IO: 0`

Both generated proof files are ignored by git through `.openclaw/`.

## Remaining

- No Harlan UI/server route is wired yet by design.
- No `package.json` scripts were added because package edits were outside the allowed isolated lane.
- A later coordinated Harlan runtime pass can decide whether these scripts are called from a terminal runner, local app action, or server-side tool route.
