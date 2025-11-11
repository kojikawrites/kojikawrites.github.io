#!/bin/bash

# Export all variables from .env
set -a
source .env
set +a

# Check if BUILD_MODE is set
if [ -z "${BUILD_MODE}" ]; then
    echo "Error: BUILD_MODE environment variable is not set (valid values: \"pip\" or \"uv\")" >&2
    exit 1
fi

echo "Building [$BUILD_MODE] docker container for [$BLOG_CODE] blog."

docker-compose down
docker network create "${BLOG_CODE}-network" 2>/dev/null || true
docker volume create "${BLOG_CODE}-dev-workspace" 2>/dev/null || true
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "${BLOG_CODE}-build-workspace" 2>/dev/null || true
docker-compose up --build -d
