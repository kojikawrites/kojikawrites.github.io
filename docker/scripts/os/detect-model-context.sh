#!/bin/bash
# Detect native context sizes for LLM models
# For Docker Model Runner: updates docker-compose.llm.yaml with actual values
# For Ollama: exits silently (no action needed)
set -e

# Exit silently if LLM is disabled
if [ "${PUBLIC_LLM_ENABLED}" = "false" ]; then
    exit 0
fi

# Exit silently if using Ollama (doesn't need integer replacement)
if [ "${LLM_PROVIDER}" = "ollama" ]; then
    exit 0
fi

# Only process for Docker Model Runner
# (either explicitly set or will be auto-detected)
COMPOSE_FILE="./compose/docker-compose.llm.yaml"
TEXT_MODEL="${LLM_DOCKER_TEXT_MODEL:-ai/llama3.1:8B-F16}"
VISION_MODEL="${LLM_DOCKER_VISION_MODEL:-ai/qwen3-vl:8B-UD-Q4_K_XL}"

get_model_context_size() {
    local model=$1
    local default=$2
    local context_size

    # Try to get context_length from model metadata
    context_size=$(docker model inspect "$model" 2>/dev/null | \
        grep 'context_length' | \
        sed -E 's/.*"([0-9]+)".*/\1/' | \
        head -1)

    if [ -n "$context_size" ] && [ "$context_size" -gt 0 ] 2>/dev/null; then
        echo "$context_size"
    else
        echo "$default"
    fi
}

# Get context sizes (with sensible defaults)
TEXT_CONTEXT=$(get_model_context_size "$TEXT_MODEL" "32768")
VISION_CONTEXT=$(get_model_context_size "$VISION_MODEL" "32768")

echo "Detected context sizes:"
echo "  Text model ($TEXT_MODEL): $TEXT_CONTEXT tokens"
echo "  Vision model ($VISION_MODEL): $VISION_CONTEXT tokens"

# Update compose file - only replace if still using variable syntax
# This prevents double-replacement if script runs multiple times

if [ -f "$COMPOSE_FILE" ]; then
    # Replace ${LLM_TEXT_CONTEXT_SIZE} with actual value + comment (if not already replaced)
    if grep -q 'context_size: \${LLM_TEXT_CONTEXT_SIZE}' "$COMPOSE_FILE"; then
        sed -i.bak "s|context_size: \${LLM_TEXT_CONTEXT_SIZE}|context_size: $TEXT_CONTEXT # \${LLM_TEXT_CONTEXT_SIZE}|g" "$COMPOSE_FILE"
        echo "Updated LLM_TEXT_CONTEXT_SIZE in $COMPOSE_FILE"
    fi

    # Replace ${LLM_VISION_CONTEXT_SIZE} with actual value + comment (if not already replaced)
    if grep -q 'context_size: \${LLM_VISION_CONTEXT_SIZE}' "$COMPOSE_FILE"; then
        sed -i.bak "s|context_size: \${LLM_VISION_CONTEXT_SIZE}|context_size: $VISION_CONTEXT # \${LLM_VISION_CONTEXT_SIZE}|g" "$COMPOSE_FILE"
        echo "Updated LLM_VISION_CONTEXT_SIZE in $COMPOSE_FILE"
    fi

    # Remove backup file
    rm -f "${COMPOSE_FILE}.bak"
else
    echo "Warning: $COMPOSE_FILE not found"
    exit 1
fi

echo "Context sizes applied to $COMPOSE_FILE"
