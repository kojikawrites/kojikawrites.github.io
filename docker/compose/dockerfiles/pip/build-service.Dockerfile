# suitable for raspberry pi

FROM node:20-alpine

# Install rsync, Python, and curl for build operations
RUN apk add --no-cache rsync python3 py3-pip curl git git-lfs cairo

# Set working directory for the build service
WORKDIR /build-service

# Copy Python service files
COPY docker/scripts/container/build-service.py /build-service/
COPY docker/scripts/container/pip/requirements.txt /build-service/

# Install Python dependencies from requirements.txt
RUN python3 -m venv /build-service/.venv
RUN /build-service/.venv/bin/pip install -r requirements.txt

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
CMD ["/build-service/.venv/bin/python", "build-service.py"]
