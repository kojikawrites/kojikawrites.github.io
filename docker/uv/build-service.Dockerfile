# suitable for most machines

FROM node:20-alpine

# Install rsync, Python, and curl for build operations
RUN apk add --no-cache rsync python3 py3-pip curl git git-lfs

# Install uv for fast Python package management (static binary for Alpine)
RUN curl -LsSf https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-musl.tar.gz | tar xz -C /usr/local/bin --strip-components=1

# Set working directory for the build service
WORKDIR /build-service

# Copy Python service files
COPY docker/build-service.py /build-service/
COPY docker/uv/pyproject.toml /build-service/

# Install Python dependencies
RUN uv venv
RUN uv add fastapi pyyaml uvicorn

# Configure git
RUN git config --global --add safe.directory /source

# Expose FastAPI port
EXPOSE 8000

# Set environment to production (for builds)
#ENV NODE_ENV=production

# Start FastAPI build service
CMD ["uv", "run", "build-service.py"]

