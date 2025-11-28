# suitable for most machines

FROM node:20-alpine

# Install rsync, Python, and curl for build operations
RUN apk add --no-cache rsync python3 py3-pip curl git git-lfs cairo

# Install uv for fast Python package management (static binary for Alpine)
RUN curl -LsSf https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-musl.tar.gz | tar xz -C /usr/local/bin --strip-components=1

# Set working directory for the build service
WORKDIR /build-service

# Copy Python service files
COPY docker/scripts/container/build-service.py /build-service/
COPY docker/scripts/container/uv/pyproject.toml /build-service/

# Install Python dependencies from pyproject.toml
RUN uv sync

# Configure git
RUN git config --global --add safe.directory /source

# Copy wisp-cli download script (will be run at container startup, not build time)
COPY docker/scripts/container/download-wisp-cli.sh /build-service/
COPY docker/scripts/container/build-service-entrypoint.sh /build-service/
RUN chmod +x /build-service/download-wisp-cli.sh /build-service/build-service-entrypoint.sh

# Expose FastAPI port
EXPOSE 8000

# Use entrypoint to download wisp-cli at startup (when /cache volume is mounted)
ENTRYPOINT ["/build-service/build-service-entrypoint.sh"]
CMD ["uv", "run", "build-service.py"]

