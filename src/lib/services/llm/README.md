# LLM Service Integration

AI-powered content assistance for image alt text generation and text editing.

## Features

- **Image Analysis**: Generate alt text for images using vision-capable LLMs
- **Text Editing**: Rewrite, correct, or enhance text content
- **Multiple Providers**: Support for Docker Model Runner, Ollama (external or containerized), OpenAI, and Claude
- **Flexible Deployment**: Three Ollama deployment options:
  - **Docker Model Runner** (Docker Desktop 4.40+): Simplified, built-in AI support
  - **External Ollama**: Use your own Ollama instance (host machine, remote server, etc.)
  - **Containerized Ollama**: We build and manage the Ollama container for you

## Quick Start

### 1. Choose Your Provider

| Provider | Value | Description |
|----------|-------|-------------|
| Docker Model Runner | `docker` | Built-in Docker Desktop AI (4.40+) |
| External Ollama | `ollama` | You manage your own Ollama instance |
| Containerized Ollama | `ollama-docker` | We build and manage Ollama container |
| OpenAI | `openai` | OpenAI API (future) |
| Claude | `claude` | Claude API (future) |

**Docker Model Runner** (`LLM_PROVIDER=docker`):
- ✅ Simpler configuration
- ✅ Automatic model management via Docker Desktop
- ✅ OpenAI-compatible API
- ⚠️ Requires Docker Desktop 4.40+ (macOS/Windows) or Compose 2.38+
- ⚠️ Uses quantized models (slightly lower quality, much faster)

**External Ollama** (`LLM_PROVIDER=ollama`):
- ✅ Use existing Ollama installation (host machine, remote server, etc.)
- ✅ No additional container created
- ✅ Full model support (not just quantized)
- ⚠️ You manage Ollama yourself

**Containerized Ollama** (`LLM_PROVIDER=ollama-docker`):
- ✅ Works on all platforms (Linux, macOS, Windows)
- ✅ We build and manage the container for you
- ✅ Full model support (not just quantized)
- ⚠️ Requires additional container and storage

### 2. Configure LLM Provider

Edit `src/.sites/[SITE_CODE]/.env`:

```bash
# Enable/disable LLM functionality (PUBLIC_ prefix for client-side access)
PUBLIC_LLM_ENABLED=true

# Provider selection (docker, ollama, ollama-docker, openai, claude)
LLM_PROVIDER=docker

# --- For Docker Model Runner (LLM_PROVIDER=docker) ---
LLM_DOCKER_TEXT_MODEL=ai/llama3.1:8B-F16
LLM_DOCKER_VISION_MODEL="ai/qwen3-vl:8B-UD-Q4_K_XL"

# --- For External Ollama (LLM_PROVIDER=ollama) ---
# You must specify the URL where YOUR Ollama instance is running
LLM_OLLAMA_URL=http://host.docker.internal:11434  # For host machine
# LLM_OLLAMA_URL=http://192.168.1.100:11434       # For remote server
LLM_OLLAMA_MODEL=llama3.2-vision:11b

# --- For Containerized Ollama (LLM_PROVIDER=ollama-docker) ---
# URL is fixed to http://ollama:11434 (internal Docker network)
LLM_OLLAMA_MODEL=llama3.2-vision:11b

# Common settings
LLM_MAX_TOKENS=8192        # Maximum tokens for responses
LLM_TEMPERATURE=0.7        # Creativity (0.0-1.0)
LLM_TIMEOUT=30000          # Request timeout in milliseconds
```

**Auto-detection**: Leave `LLM_PROVIDER` unset to auto-detect:
- Uses Docker Model Runner if available (Compose 2.38+)
- Falls back to containerized Ollama otherwise
- Set `PUBLIC_LLM_ENABLED=false` to disable LLM entirely

### 3. Start Docker Services

```bash
cd docker
./pip-docker-build.sh  # or uv-docker-build.sh
```

**Docker Model Runner** will automatically:
- Pull the model from Docker Hub (e.g., `ai/qwen3-vl:8B-UD-Q4_K_XL`)
- Start the model runner service
- Inject environment variables (`LLM_URL`, `LLM_MODEL`)

**Custom Ollama** will automatically:
- Start in Docker
- Pull configured model(s) from Ollama library
- Be available at `http://ollama:11434`

### 4. Use in Code

```typescript
import { getLLMService } from '@/lib/services/llm/llmService';

// Generate alt text
const llm = await getLLMService();
const altText = await llm.analyzeImage(
  imageData,  // base64 data URI
  "Describe this image for alt text"
);

// Edit text
const edited = await llm.editText(
  "Original text",
  "Make it more concise"
);
```

### 5. Use API Endpoints

**Generate Alt Text:**
```javascript
const response = await fetch('/api/llm/image-alt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image: 'data:image/jpeg;base64,...',
    context: 'Article about web development'
  })
});

const { altText } = await response.json();
```

**Edit Text:**
```javascript
const response = await fetch('/api/llm/text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'edit',
    text: 'Your text here',
    instruction: 'Fix grammar and spelling'
  })
});

const { result } = await response.json();
```

## Configuration Options

### Disabling LLM

To completely disable LLM functionality:

```bash
PUBLIC_LLM_ENABLED=false
```

This prevents any LLM containers from starting and skips model downloads.

### Changing Models

Update the appropriate model variable for your deployment mode:

**For Docker Model Runner:**
```bash
LLM_DOCKER_MODEL="ai/qwen3-vl:4B-UD-Q4_K_XL"  # Lighter, faster
LLM_DOCKER_MODEL="ai/qwen3-vl:32B-UD-Q4_K_XL" # Highest quality
```

**For Custom Ollama:**
```bash
LLM_OLLAMA_MODEL=llava:7b                # Lighter, faster vision
LLM_OLLAMA_MODEL=llama3.2-vision:90b     # Highest quality
```

### Advanced: Dual Model Setup

For separate text and vision models (custom Ollama only):

```bash
LLM_OLLAMA_TEXT_MODEL=llama3.1:8b       # Fast text-only
LLM_OLLAMA_VISION_MODEL=llama3.2-vision:11b  # Vision-capable
```

**Note:** Context is NOT shared between different models.

## Available Models

### Docker Model Runner (ai/ namespace on Docker Hub)

Quantized models optimized for local inference. Smaller size, faster loading:

**Vision-Capable (Text + Images):**

| Model | Size | Quantization | Best For |
|-------|------|--------------|----------|
| `ai/qwen3-vl:8B-UD-Q4_K_XL` | 8.19B | Q4_K_XL | **Recommended** - Best balance |
| `ai/qwen3-vl:32B-UD-Q4_K_XL` | 32.76B | Q4_K_XL | Highest quality (slow) |
| `ai/qwen3-vl:4B-UD-Q4_K_XL` | 4.02B | Q4_K_XL | Lighter, faster |
| `ai/qwen3-vl:2B-UD-Q4_K_XL` | 1.72B | Q4_K_XL | Very fast, limited capability |

**Text-Only (No Image Support):**

| Model | Size | Quantization | Best For |
|-------|------|--------------|----------|
| `ai/llama3.3:70B-Q4_K_M` | 70B | Q4_K_M | Highest quality text |
| `ai/llama3.2:3B-Q4_K_M` | 3.21B | Q4_K_M | Fast, lightweight |
| `ai/llama3.2:1B-Q4_0` | 1.24B | Q4_0 | Very fast, minimal |

**Note:** llama3.2-vision models (11B, 90B) are not yet available on Docker Hub.

Browse all models: https://hub.docker.com/u/ai

### Custom Ollama Container (Ollama library)

Full models from Ollama's library. Larger size, slightly higher quality:

**Vision-Capable (Text + Images):**

| Model | Size | Best For |
|-------|------|----------|
| `llama3.2-vision:11b` | ~7GB | Recommended balance |
| `llama3.2-vision:90b` | ~55GB | Highest quality (slow) |
| `llava:7b` | ~4.5GB | Faster, lighter vision |
| `llava:13b` | ~8GB | Balanced vision specialist |

**Text-Only (Faster):**

| Model | Size | Best For |
|-------|------|----------|
| `llama3.1:8b` | ~4.7GB | Fast, general purpose |
| `llama3.1:70b` | ~40GB | Highest quality text |
| `mistral:7b` | ~4.1GB | Fast alternative |

## Provider Architecture

```
┌─────────────────┐
│  API Endpoints  │  /api/llm/text, /api/llm/image-alt
└────────┬────────┘
         │
┌────────▼────────┐
│  LLM Service    │  Provider selection & caching
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐  ┌──────┐
│Ollama│  │OpenAI │  │Claude│  (Future)
└──────┘  └───────┘  └──────┘
```

## Adding OpenAI Support (Future)

1. Install dependency:
```bash
npm install openai
```

2. Configure in `.env`:
```bash
LLM_PROVIDER=openai
LLM_OPENAI_API_KEY=sk-...
LLM_OPENAI_TEXT_MODEL=gpt-4-turbo
LLM_OPENAI_VISION_MODEL=gpt-4-vision-preview
```

3. Implement `src/lib/services/llm/providers/openai.ts` (see file for TODOs)

## Adding Claude Support (Future)

1. Install dependency:
```bash
npm install @anthropic-ai/sdk
```

2. Configure in `.env`:
```bash
LLM_PROVIDER=claude
LLM_ANTHROPIC_API_KEY=sk-ant-...
LLM_ANTHROPIC_TEXT_MODEL=claude-3-5-sonnet-20241022
```

3. Implement `src/lib/services/llm/providers/claude.ts` (see file for TODOs)

## GPU Support

Ollama can use GPU acceleration if available:

1. Install [nvidia-docker](https://github.com/NVIDIA/nvidia-docker)
2. Uncomment GPU section in `docker/docker-compose.yaml`:

```yaml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

3. Rebuild containers

## Troubleshooting

### Model Not Found

If Ollama can't find the model:

```bash
# Check running models
docker exec hiivelabs-ollama ollama list

# Pull model manually
docker exec hiivelabs-ollama ollama pull llama3.2-vision:11b
```

### Slow Performance

- **CPU-only**: Models run slower without GPU (1-10s per request)
- **Large models**: Use smaller models (7b-13b instead of 70b-90b)
- **Memory**: Ensure Docker has enough RAM allocated

### Connection Errors

If can't connect to Ollama:

```bash
# Check if Ollama container is running
docker ps | grep ollama

# Check Ollama logs
docker logs hiivelabs-ollama

# Test Ollama API
curl http://localhost:11434/api/tags
```

## Development Only

⚠️ **Important**: LLM APIs are **DEV MODE ONLY** and not available in production builds. This is intentional for security and cost control.

## File Structure

```
src/lib/services/llm/
├── README.md              # This file
├── types.ts               # TypeScript interfaces
├── llmService.ts          # Main service entry point
└── providers/
    ├── ollama.ts          # Ollama implementation ✅
    ├── openai.ts          # OpenAI stub (TODO)
    └── claude.ts          # Claude stub (TODO)

src/pages/api/llm/
├── text.ts                # Text generation/editing endpoint
└── image-alt.ts           # Image analysis endpoint

docker/
├── docker-compose.yaml      # Service definitions with Docker Model Runner support
├── check-model-runner.sh    # Check Docker Model Runner availability (bash)
├── check-model-runner.bat   # Check Docker Model Runner availability (batch)
├── check-model-runner.ps1   # Check Docker Model Runner availability (PowerShell)
├── ollama.Dockerfile        # Custom Ollama image (fallback option)
├── ollama-entrypoint.sh     # Startup script for custom Ollama
└── ollama-init.sh           # Model initialization script for custom Ollama
```

## Model Storage

Models are stored in a **shared Docker volume** (`blog-ollama-models`) that persists across:
- Container restarts
- Site switches
- Docker rebuilds

This saves disk space and download time when working with multiple sites.

## Cost Comparison

| Provider | Image Analysis | Text Edit | Notes |
|----------|---------------|-----------|-------|
| **Ollama** | Free | Free | Local, private, no limits |
| OpenAI | ~$0.01/image | ~$0.002/1K tokens | API costs, rate limits |
| Claude | ~$0.01/image | ~$0.003/1K tokens | API costs, rate limits |

## Privacy

- **Ollama**: All processing happens locally, no data sent to external services
- **OpenAI/Claude**: Data is sent to external APIs (check their privacy policies)