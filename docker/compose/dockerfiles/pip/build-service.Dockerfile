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

# download wisp-cli
RUN curl https://sites.wisp.place/nekomimi.pet/wisp-cli-binaries/wisp-cli-x86_64-linux -o wisp-cli
RUN chmod +x wisp-cli

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI build service
CMD ["/build-service/.venv/bin/python", "build-service.py"]
