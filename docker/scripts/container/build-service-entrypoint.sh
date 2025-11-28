#!/bin/sh
# Build service entrypoint
# Downloads wisp-cli (with caching) then starts the FastAPI service

# Run wisp-cli download script (has access to /cache volume at runtime)
/build-service/download-wisp-cli.sh

# Start the FastAPI build service
exec "$@"