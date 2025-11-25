#!/bin/bash

# Export all variables from .env
set -a
source ../.env
# shellcheck disable=SC1090
source "../src/.sites/${SITE_CODE}/.env"
set +a

# Ensure cleanup always runs on exit (success or failure)
trap 'scripts/os/restore-model-context.sh' EXIT

# Check if DOCKER_BUILD_MODE is set
if [ -z "${DOCKER_BUILD_MODE}" ]; then
    echo "Error: DOCKER_BUILD_MODE environment variable is not set (valid values: \"pip\" or \"uv\")" >&2
    exit 1
fi
if [ -z "${DOCKER_BLOG_CODE}" ]; then
    echo "Error: DOCKER_BLOG_CODE environment variable is not set (e.g. \"hiivelabs\")" >&2
    exit 1
fi

echo "Building [$DOCKER_BUILD_MODE] docker container for [$DOCKER_BLOG_CODE] blog."

# Detect and apply model context sizes to compose file
scripts/os/detect-model-context.sh

# Compose file configuration
COMPOSE_FILES="-f compose/docker-compose.yaml"

# Auto-detect Docker Model Runner capability (unless manually overridden)
if [ -z "${COMPOSE_PROFILES}" ]; then
    # Check if LLM is disabled
    if [ "${PUBLIC_LLM_ENABLED}" = "false" ]; then
        export COMPOSE_PROFILES=no-llm
        echo ""
        echo "🚫 LLM functionality disabled (PUBLIC_LLM_ENABLED=false)"
        echo ""
    # Check if user explicitly chose Docker Model Runner
    elif [ "${LLM_PROVIDER}" = "docker" ]; then
        COMPOSE_FILES="-f compose/docker-compose.yaml -f compose/docker-compose.llm.yaml"
        echo ""
        echo "🐳 Using Docker Model Runner (LLM_PROVIDER=docker)"

        # Track missing models
        MISSING_MODELS=()

        # Check for dual-model configuration
        if [ -n "$LLM_DOCKER_TEXT_MODEL" ] && [ -n "$LLM_DOCKER_VISION_MODEL" ]; then
            # Dual-model mode
            TEXT_MODEL=$(echo "$LLM_DOCKER_TEXT_MODEL" | sed 's/^ai\///')
            VISION_MODEL=$(echo "$LLM_DOCKER_VISION_MODEL" | sed 's/^ai\///')

            # Check text model
            if docker model list 2>/dev/null | grep -q "$TEXT_MODEL"; then
                echo "   ✓ Text model cached: $TEXT_MODEL"
            else
                echo "   ✗ Text model missing: $TEXT_MODEL"
                MISSING_MODELS+=("$LLM_DOCKER_TEXT_MODEL")
            fi

            # Check vision model
            if docker model list 2>/dev/null | grep -q "$VISION_MODEL"; then
                echo "   ✓ Vision model cached: $VISION_MODEL"
            else
                echo "   ✗ Vision model missing: $VISION_MODEL"
                MISSING_MODELS+=("$LLM_DOCKER_VISION_MODEL")
            fi
        else
            # Single-model mode
            FULL_MODEL="${LLM_DOCKER_MODEL:-ai/qwen3-vl:8B-UD-Q4_K_XL}"
            MODEL_NAME=$(echo "$FULL_MODEL" | sed 's/^ai\///')
            if docker model list 2>/dev/null | grep -q "$MODEL_NAME"; then
                echo "   ✓ Model cached: $MODEL_NAME"
            else
                echo "   ✗ Model missing: $MODEL_NAME"
                MISSING_MODELS+=("$FULL_MODEL")
            fi
        fi

        # If models are missing, cancel build with instructions
        if [ ${#MISSING_MODELS[@]} -gt 0 ]; then
            echo ""
            echo "❌ Required Docker models are not available"
            echo ""
            echo "Please pull the missing models before building:"
            echo ""
            for model in "${MISSING_MODELS[@]}"; do
                echo "  docker model pull $model"
            done
            echo ""
            echo "Or disable LLM features by setting PUBLIC_LLM_ENABLED=false in .env"
            echo ""
            exit 1
        fi
        echo ""
    # Check if user explicitly chose containerized Ollama (we manage the container)
    elif [ "${LLM_PROVIDER}" = "ollama-docker" ]; then
        export COMPOSE_PROFILES=ollama
        echo ""
        echo "📦 Using containerized Ollama (LLM_PROVIDER=ollama-docker)"
        echo "   URL: http://ollama:11434 (internal Docker network)"
        echo ""
    # Check if user is using external Ollama (they manage it)
    elif [ "${LLM_PROVIDER}" = "ollama" ]; then
        # No Ollama container needed - user manages their own Ollama instance
        export COMPOSE_PROFILES=no-llm
        echo ""
        echo "🔗 Using external Ollama (LLM_PROVIDER=ollama)"
        echo "   URL: ${LLM_OLLAMA_URL:-http://host.docker.internal:11434}"
        echo "   Note: Ensure your Ollama instance is running and accessible"
        echo ""
    # Check if user is using OpenAI API
    elif [ "${LLM_PROVIDER}" = "openai" ]; then
        # No local LLM container needed - using OpenAI API
        export COMPOSE_PROFILES=no-llm
        echo ""
        echo "🌐 Using OpenAI API (LLM_PROVIDER=openai)"
        if [ -z "${LLM_OPENAI_API_KEY}" ]; then
            echo "   ⚠️  Warning: LLM_OPENAI_API_KEY not set"
        else
            echo "   ✓ API key configured"
        fi
        echo "   Text model: ${LLM_OPENAI_TEXT_MODEL:-gpt-4o}"
        echo "   Vision model: ${LLM_OPENAI_VISION_MODEL:-gpt-4o}"
        echo ""
    # Check if user is using Claude/Anthropic API
    elif [ "${LLM_PROVIDER}" = "claude" ]; then
        # No local LLM container needed - using Anthropic API
        export COMPOSE_PROFILES=no-llm
        echo ""
        echo "🤖 Using Claude/Anthropic API (LLM_PROVIDER=claude)"
        if [ -z "${LLM_ANTHROPIC_API_KEY}" ]; then
            echo "   ⚠️  Warning: LLM_ANTHROPIC_API_KEY not set"
        else
            echo "   ✓ API key configured"
        fi
        echo "   Text model: ${LLM_ANTHROPIC_TEXT_MODEL:-claude-sonnet-4-20250514}"
        echo "   Vision model: ${LLM_ANTHROPIC_VISION_MODEL:-claude-sonnet-4-20250514}"
        echo ""
    # Check for unknown providers
    elif [ -n "${LLM_PROVIDER}" ]; then
        echo ""
        echo "❌ Unknown LLM provider '${LLM_PROVIDER}'" 1>&2
        echo "   Valid options: docker, ollama, ollama-docker, openai, claude" 1>&2
        echo ""
        exit 1
    else
        echo ""
        echo "🔍 Auto-detecting LLM deployment method..."

        # Check Docker Compose version
        COMPOSE_VERSION=$(docker compose version --short 2>/dev/null | sed 's/^v//')
        COMPOSE_MAJOR=$(echo "$COMPOSE_VERSION" | cut -d. -f1)
        COMPOSE_MINOR=$(echo "$COMPOSE_VERSION" | cut -d. -f2)

        USE_MODEL_RUNNER=false

        # Check if Docker Compose 2.38+ and docker model command available
        if [ "$COMPOSE_MAJOR" -ge 2 ] && [ "$COMPOSE_MINOR" -ge 38 ]; then
            if docker model --help &>/dev/null; then
                USE_MODEL_RUNNER=true
                COMPOSE_FILES="-f compose/docker-compose.yaml -f compose/docker-compose.llm.yaml"

                echo "✅ Docker Model Runner available (Compose $COMPOSE_VERSION)"

                # Track missing models
                MISSING_MODELS=()

                # Check for dual-model configuration
                if [ -n "$LLM_DOCKER_TEXT_MODEL" ] && [ -n "$LLM_DOCKER_VISION_MODEL" ]; then
                    # Dual-model mode
                    TEXT_MODEL=$(echo "$LLM_DOCKER_TEXT_MODEL" | sed 's/^ai\///')
                    VISION_MODEL=$(echo "$LLM_DOCKER_VISION_MODEL" | sed 's/^ai\///')

                    # Check text model
                    if docker model list 2>/dev/null | grep -q "$TEXT_MODEL"; then
                        echo "   ✓ Text model cached: $TEXT_MODEL"
                    else
                        echo "   ✗ Text model missing: $TEXT_MODEL"
                        MISSING_MODELS+=("$LLM_DOCKER_TEXT_MODEL")
                    fi

                    # Check vision model
                    if docker model list 2>/dev/null | grep -q "$VISION_MODEL"; then
                        echo "   ✓ Vision model cached: $VISION_MODEL"
                    else
                        echo "   ✗ Vision model missing: $VISION_MODEL"
                        MISSING_MODELS+=("$LLM_DOCKER_VISION_MODEL")
                    fi
                else
                    # Single-model mode
                    FULL_MODEL="${LLM_DOCKER_MODEL:-ai/qwen3-vl:8B-UD-Q4_K_XL}"
                    MODEL_NAME=$(echo "$FULL_MODEL" | sed 's/^ai\///')
                    if docker model list 2>/dev/null | grep -q "$MODEL_NAME"; then
                        echo "   ✓ Model cached: $MODEL_NAME"
                    else
                        echo "   ✗ Model missing: $MODEL_NAME"
                        MISSING_MODELS+=("$FULL_MODEL")
                    fi
                fi

                # If models are missing, cancel build with instructions
                if [ ${#MISSING_MODELS[@]} -gt 0 ]; then
                    echo ""
                    echo "❌ Required Docker models are not available"
                    echo ""
                    echo "Please pull the missing models before building:"
                    echo ""
                    for model in "${MISSING_MODELS[@]}"; do
                        echo "  docker model pull $model"
                    done
                    echo ""
                    echo "Or disable LLM features by setting PUBLIC_LLM_ENABLED=false in .env"
                    echo ""
                    exit 1
                fi
            fi
        fi

        if [ "$USE_MODEL_RUNNER" = false ]; then
            export COMPOSE_PROFILES=ollama
            echo "📦 Using custom Ollama container (fallback mode)"
            echo "   Compose version: $COMPOSE_VERSION"
            echo ""
            echo "ℹ️  Required Ollama models:"

            # Check for dual-model configuration
            if [ -n "$LLM_OLLAMA_TEXT_MODEL" ] && [ -n "$LLM_OLLAMA_VISION_MODEL" ]; then
                echo "   - Text model: $LLM_OLLAMA_TEXT_MODEL"
                echo "   - Vision model: $LLM_OLLAMA_VISION_MODEL"
            else
                OLLAMA_MODEL="${LLM_OLLAMA_MODEL:-llama3.2-vision:11b}"
                echo "   - Model: $OLLAMA_MODEL"
            fi

            echo ""
            echo "   After container starts, pull models with:"
            if [ -n "$LLM_OLLAMA_TEXT_MODEL" ] && [ -n "$LLM_OLLAMA_VISION_MODEL" ]; then
                echo "   docker exec ${DOCKER_BLOG_CODE}-ollama ollama pull $LLM_OLLAMA_TEXT_MODEL"
                echo "   docker exec ${DOCKER_BLOG_CODE}-ollama ollama pull $LLM_OLLAMA_VISION_MODEL"
            else
                echo "   docker exec ${DOCKER_BLOG_CODE}-ollama ollama pull ${LLM_OLLAMA_MODEL:-llama3.2-vision:11b}"
            fi
        fi

        echo ""
    fi
else
    echo "ℹ️  Using manually configured profile: $COMPOSE_PROFILES"
    if [ "$COMPOSE_PROFILES" != "ollama" ] && [ "$COMPOSE_PROFILES" != "no-llm" ]; then
        COMPOSE_FILES="-f compose/docker-compose.yaml -f compose/docker-compose.llm.yaml"
    fi
    echo ""
fi

# Stop all containers for this project (including ones from inactive profiles)
docker compose -f compose/docker-compose.yaml --profile ollama -p "${DOCKER_BLOG_CODE}" down 2>/dev/null || true
docker network create "${DOCKER_BLOG_CODE}-network" 2>/dev/null || true
docker volume create "${DOCKER_BLOG_CODE}-dev-workspace" 2>/dev/null || true
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "${DOCKER_BLOG_CODE}-build-workspace" 2>/dev/null || true
docker volume create "blog-ollama-models" 2>/dev/null || true
docker volume create "blog-ssl-certs" 2>/dev/null || true
docker compose ${COMPOSE_FILES} -p "${DOCKER_BLOG_CODE}" up --build -d
