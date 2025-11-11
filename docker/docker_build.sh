#!/bin/bash

# Export all variables from .env
set -a
source ../.env
set +a

# Check if BUILD_MODE is set
if [ -z "${DOCKER_BUILD_MODE}" ]; then
    echo "Error: DOCKER_BUILD_MODE environment variable is not set (valid values: \"pip\" or \"uv\")" >&2
    exit 1
fi
if [ -z "${DOCKER_BLOG_CODE}" ]; then
    echo "Error: DOCKER_BLOG_CODE environment variable is not set (e.g. \"hiivelabs\")" >&2
    exit 1
fi

echo "Building [$DOCKER_BUILD_MODE] docker container for [$DOCKER_BLOG_CODE] blog."

docker-compose -p "${DOCKER_BLOG_CODE}" down 2>/dev/null || true
docker network create "${DOCKER_BLOG_CODE}-network" 2>/dev/null || true
docker volume create "${DOCKER_BLOG_CODE}-dev-workspace" 2>/dev/null || true
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "${DOCKER_BLOG_CODE}-build-workspace" 2>/dev/null || true
docker-compose -p "${DOCKER_BLOG_CODE}" up --build -d
