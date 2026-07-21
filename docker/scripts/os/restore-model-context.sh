#!/bin/bash
# Restore docker-compose.llm.yaml to use environment variable syntax
# This reverses the changes made by detect-model-context.sh
set -e

# Exit silently if LLM is disabled
if [ "${PUBLIC_LLM_ENABLED}" = "false" ]; then
    exit 0
fi

# Exit silently if using Ollama (no restoration needed)
if [ "${LLM_PROVIDER}" = "ollama" ]; then
    exit 0
fi

COMPOSE_FILE="./compose/docker-compose.llm.yaml"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Warning: $COMPOSE_FILE not found"
    exit 1
fi

# Restore ${LLM_TEXT_CONTEXT_SIZE} from inline values
if grep -q 'context_size: [0-9]* # \${LLM_TEXT_CONTEXT_SIZE}' "$COMPOSE_FILE"; then
    sed -i.bak 's|context_size: [0-9]* # \${LLM_TEXT_CONTEXT_SIZE}|context_size: ${LLM_TEXT_CONTEXT_SIZE}|g' "$COMPOSE_FILE"
    echo "Restored LLM_TEXT_CONTEXT_SIZE in $COMPOSE_FILE"
fi

# Restore ${LLM_VISION_CONTEXT_SIZE} from inline values
if grep -q 'context_size: [0-9]* # \${LLM_VISION_CONTEXT_SIZE}' "$COMPOSE_FILE"; then
    sed -i.bak 's|context_size: [0-9]* # \${LLM_VISION_CONTEXT_SIZE}|context_size: ${LLM_VISION_CONTEXT_SIZE}|g' "$COMPOSE_FILE"
    echo "Restored LLM_VISION_CONTEXT_SIZE in $COMPOSE_FILE"
fi

# Remove backup file
rm -f "${COMPOSE_FILE}.bak"

echo "Restored environment variable syntax in $COMPOSE_FILE"
