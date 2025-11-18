#!/bin/bash
set -e

echo "🤖 Starting Ollama container..."

# Load site-specific environment variables if available
if [ -f "/source/src/.sites/${SITE_CODE}/.env" ]; then
  echo "📝 Loading site-specific .env for ${SITE_CODE}..."
  set -a
  source "/source/src/.sites/${SITE_CODE}/.env"
  set +a
else
  echo "⚠️  No site-specific .env found at /source/src/.sites/${SITE_CODE}/.env"
fi

# Start Ollama server in background
echo "🚀 Starting Ollama server..."
/bin/ollama serve &

# Wait for server to be ready
echo "⏳ Waiting for Ollama server to start..."
until curl -s http://localhost:11434/api/tags >/dev/null 2>&1; do
  sleep 1
done
echo "✅ Ollama server ready"

# Pull configured models
ollama-init.sh

# Keep container running
echo "🎬 Ollama is running and ready for requests"
wait