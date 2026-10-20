# Image Agent — Design Notes

## Purpose

The image agent converts a user request into an image-generation prompt,
invokes the configured image-generation provider, and returns the generated
image or a useful error message.

## Pipeline

```
user prompt
   │
   ├─► imagePromptEnhancer.normalizeImageSubject()   strip wrappers ("create an image of…")
   ├─► imagePromptEnhancer.detectStyle()             anime | watercolor | photorealistic | …
   ├─► imagePromptEnhancer.classifyScene()           portrait | product | landscape | …
   ├─► imagePromptEnhancer.parseAspectRatio()        "16:9" → 1024×576
   └─► enhanceImagePrompt()                          deterministic template
                                                       └─ optional LLM refinement
   │
   ▼
image generation (flux → default → turbo fallback chain)
   │
   ├─► storeImage()          → local temp cache + optional S3 upload
   └─► presigned URL (24h)   → returned to the client
```

## Image quality

Prompts preserve the user's original intent while adding relevant visual
details, including:

- Main subject, setting, and intended use
- Composition, framing, and perspective
- Lighting, shadows, and color palette
- Materials, textures, and environmental details
- Photographic style and camera characteristics when appropriate

Unrelated subjects or details that change the user's request are never added.
Negative prompts are only used when the selected provider supports them.

## Reliability

- Validate that the user supplied a meaningful prompt.
- Apply provider-supported request options and timeouts.
- Handle rate limits, invalid credentials, and provider failures gracefully.
- Never log API keys, credentials, or sensitive request data.
- Return a clear error when image generation fails.
- Preserve the existing image URL and storage integration contracts.
- `preservesIntent()` rejects a rewritten prompt that has drifted from the
  original request, and the enhancer falls back to the deterministic template.

## Configuration

All configuration is read from the environment (see `.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `IMAGE_MODEL_CHAIN` | Ordered provider/model fallback chain | `flux,default,turbo` |
| `IMAGE_GEN_TIMEOUT_MS` | Per-request generation timeout | `20000` |
| `BLOCK_REAL_PERSON_GENERATION` | Refuse prompts depicting real people | `true` |
| `IMAGE_PROMPT_ENHANCER` | Set to `off` to bypass LLM refinement | `on` |
| `IMAGE_AUTO_ASPECT` | Derive the aspect ratio from the scene | `true` |
| `AWS_BUCKET_NAME` | S3 bucket for generated images | — |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3 credentials | — |

Do not commit real credentials or production environment files to Git.
Verify supported models, parameters, image sizes, and negative-prompt behaviour
against the provider's official documentation.

## Testing

```bash
npm test --prefix backend/services/agent
```

The suite covers prompt normalisation, style detection, scene classification,
aspect-ratio resolution, intent preservation, and the deterministic fallback
path. It is also executed by the `ci.yml` GitHub Actions workflow.

To verify end-to-end, run the agent service with the image provider
configured, generate an image, confirm it renders in the UI, and — where S3
is enabled — confirm it is uploaded and served through a presigned URL.

## Deployment

Deploy through the repository's established workflow after the tests pass:

```bash
# Local
docker compose -f docker-compose.prod.yml up -d --build

# EC2
./deploy-to-ec2.sh <EC2_PUBLIC_IP>

# CI/CD
GitHub Actions -> "Deploy to EC2" -> Run workflow
```

Check the agent logs and test image generation after deployment. Never print
secrets in logs or commit them to the repository.
