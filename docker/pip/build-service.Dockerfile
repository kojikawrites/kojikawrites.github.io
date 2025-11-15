# suitable for raspberry pi

FROM node:20-alpine

# Install rsync, Python, and curl for build operations
RUN apk add --no-cache rsync python3 py3-pip curl git git-lfs

# Set working directory for the build service
WORKDIR /build-service

# Copy Python service files
COPY docker/build-service.py /build-service/
COPY docker/pip/requirements.txt /build-service/

# Install Python dependencies
RUN python3 -m venv /build-service/.venv
RUN . /build-service/.venv/bin/activate
RUN /build-service/.venv/bin/pip install fastapi pyyaml uvicorn
# RUN /build-service/.venv/bin/pip install  -r requirements.txt

# Configure git
RUN git config --global --add safe.directory /source

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI build service
CMD ["/build-service/.venv/bin/python", "build-service.py"]
