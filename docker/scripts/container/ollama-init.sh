#!/bin/bash
#
# Ollama Model Initialization Script
#
# Automatically pulls configured LLM models based on environment variables.
# Runs on container startup to ensure models are available.
#

set -e

echo "====================================="
echo "Ollama Model Initialization"
echo "====================================="

# Function to pull a model if not already present
pull_model() {
    local model=$1
    echo "Checking model: $model"

    # Check if model already exists
    if ollama list | grep -q "^${model}"; then
        echo "✓ Model $model already downloaded"
        return 0
    fi

    echo "📥 Pulling model: $model (this may take a while...)"
    if ollama pull "$model"; then
        echo "✓ Successfully pulled $model"
        return 0
    else
        echo "✗ Failed to pull $model"
        return 1
    fi
}

# Determine which models to pull based on configuration
if [ -n "$LLM_OLLAMA_TEXT_MODEL" ] && [ -n "$LLM_OLLAMA_VISION_MODEL" ]; then
    echo ""
    echo "Dual-model configuration detected:"
    echo "  Text model: $LLM_OLLAMA_TEXT_MODEL"
    echo "  Vision model: $LLM_OLLAMA_VISION_MODEL"
    echo ""

    pull_model "$LLM_OLLAMA_TEXT_MODEL"
    pull_model "$LLM_OLLAMA_VISION_MODEL"

elif [ -n "$LLM_OLLAMA_MODEL" ]; then
    echo ""
    echo "Single-model configuration detected:"
    echo "  Model: $LLM_OLLAMA_MODEL"
    echo ""

    pull_model "$LLM_OLLAMA_MODEL"

else
    echo ""
    echo "⚠️  No LLM models configured in .env"
    echo "Set either:"
    echo "  - LLM_OLLAMA_MODEL for single model (text + vision)"
    echo "  - LLM_OLLAMA_TEXT_MODEL and LLM_OLLAMA_VISION_MODEL for dual models"
    echo ""
    echo "Using default: llama3.2-vision:11b"
    echo ""

    pull_model "llama3.2-vision:11b"
fi

echo ""
echo "====================================="
echo "Model initialization complete!"
echo "====================================="
echo ""
echo "Available models:"
ollama list

echo ""
echo "Ollama is ready to use at http://ollama:11434"
echo ""