#!/bin/bash
# Check if Docker Model Runner is available
# Returns 0 if available, 1 if not

set -e

echo "🔍 Checking Docker Model Runner availability..."
echo ""

# Check Docker Compose version
echo "1️⃣  Checking Docker Compose version..."
if ! command -v docker &> /dev/null; then
    echo "   ❌ Docker not found. Please install Docker."
    exit 1
fi

COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "0.0.0")
echo "   Docker Compose version: $COMPOSE_VERSION"

# Parse version (expecting format like 2.38.0 or v2.38.0)
COMPOSE_VERSION_CLEAN=$(echo "$COMPOSE_VERSION" | sed 's/^v//')
COMPOSE_MAJOR=$(echo "$COMPOSE_VERSION_CLEAN" | cut -d. -f1)
COMPOSE_MINOR=$(echo "$COMPOSE_VERSION_CLEAN" | cut -d. -f2)

REQUIRED_MAJOR=2
REQUIRED_MINOR=38

if [ "$COMPOSE_MAJOR" -lt "$REQUIRED_MAJOR" ] || \
   ([ "$COMPOSE_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$COMPOSE_MINOR" -lt "$REQUIRED_MINOR" ]); then
    echo "   ❌ Docker Compose $REQUIRED_MAJOR.$REQUIRED_MINOR+ required"
    echo "   Current version: $COMPOSE_VERSION_CLEAN"
    echo ""
    echo "📝 Recommendation: Use custom Ollama container"
    exit 1
fi

echo "   ✅ Docker Compose $REQUIRED_MAJOR.$REQUIRED_MINOR+ detected"
echo ""

# Check if Docker Desktop is installed (for macOS/Windows)
echo "2️⃣  Checking Docker Desktop..."
DOCKER_CONTEXT=$(docker context show 2>/dev/null || echo "unknown")
DOCKER_INFO=$(docker info 2>/dev/null || echo "")

if echo "$DOCKER_INFO" | grep -q "Docker Desktop"; then
    DESKTOP_VERSION=$(echo "$DOCKER_INFO" | grep "Server Version" | awk '{print $3}' || echo "unknown")
    echo "   Docker Desktop detected: $DESKTOP_VERSION"

    # Check for Docker Desktop 4.40+
    if [ "$DESKTOP_VERSION" != "unknown" ]; then
        DESKTOP_MAJOR=$(echo "$DESKTOP_VERSION" | cut -d. -f1)
        DESKTOP_MINOR=$(echo "$DESKTOP_VERSION" | cut -d. -f2)

        if [ "$DESKTOP_MAJOR" -ge 5 ] || \
           ([ "$DESKTOP_MAJOR" -eq 4 ] && [ "$DESKTOP_MINOR" -ge 40 ]); then
            echo "   ✅ Docker Desktop 4.40+ detected"
        else
            echo "   ⚠️  Docker Desktop 4.40+ recommended for best experience"
            echo "   Current version: $DESKTOP_VERSION"
        fi
    fi
else
    echo "   ℹ️  Docker Desktop not detected (using Docker Engine)"
    echo "   Model Runner may have limited functionality without Docker Desktop"
fi

echo ""

# Test if model runner command is available
echo "3️⃣  Testing Docker Model Runner command..."
if docker model --help &> /dev/null; then
    echo "   ✅ 'docker model' command available"
else
    echo "   ❌ 'docker model' command not available"
    echo "   This is expected on Linux or older Docker versions"
    echo ""
    echo "📝 Recommendation: Use custom Ollama container"
    exit 1
fi

echo ""
echo "✅ Docker Model Runner is available!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit docker/docker-compose.yaml:"
echo "      - Uncomment the 'models' section at the bottom"
echo "      - Uncomment the 'models' section in the blog service"
echo "      - Comment out the 'ollama' service"
echo ""
echo "   2. The model will be automatically pulled on first 'docker compose up'"
echo ""
echo "   3. Environment variables will be injected:"
echo "      - LLM_OLLAMA_URL (from endpoint_var)"
echo "      - LLM_MODEL_NAME (from model_var)"
echo ""
exit 0