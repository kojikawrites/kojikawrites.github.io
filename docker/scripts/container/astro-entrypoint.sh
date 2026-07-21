#!/bin/sh
set -e

echo "🚀 Starting blog-dev container..."

# Generate SSL certificates if they don't exist
if [ -f /usr/local/bin/generate-ssl-cert.sh ]; then
    /usr/local/bin/generate-ssl-cert.sh
fi

# Container maintains its own package-lock.json in the node_modules volume
# This prevents conflicts between host (macOS) and container (Linux) lock files
PACKAGE_JSON="/app/package.json"
CONTAINER_LOCK="/app/node_modules/package-lock.json"
MARKER_FILE="/app/node_modules/.install-timestamp"

should_install=false

# Check if node_modules exists
if [ ! -d "/app/node_modules" ]; then
    echo "📦 node_modules not found, running npm install..."
    should_install=true
# Check if container's lock file doesn't exist
elif [ ! -f "$CONTAINER_LOCK" ]; then
    echo "📦 Container package-lock.json not found, running npm install..."
    should_install=true
# Check if package.json is newer than the marker (dependencies changed)
elif [ ! -f "$MARKER_FILE" ] || [ "$PACKAGE_JSON" -nt "$MARKER_FILE" ]; then
    echo "📦 package.json has been updated, running npm install..."
    should_install=true
else
    echo "✅ node_modules is up to date"
fi

# Set up package-lock.json overlay using bind mount
# This keeps the host's file untouched while container uses its own version
setup_lock_overlay() {
    # Check if already mounted
    if mountpoint -q /app/package-lock.json 2>/dev/null; then
        echo "✅ package-lock.json overlay already active"
        return 0
    fi

    # Ensure container's lock file exists in the volume
    if [ ! -f "$CONTAINER_LOCK" ]; then
        # No container lock yet - copy from host if it exists, or create empty
        if [ -f /app/package-lock.json ]; then
            echo "📝 Initializing container's package-lock.json from host..."
            cp /app/package-lock.json "$CONTAINER_LOCK"
        else
            echo "📝 Creating empty package-lock.json for container..."
            echo "{}" > "$CONTAINER_LOCK"
        fi
    fi

    # Ensure target file exists for bind mount (even if empty)
    if [ ! -f /app/package-lock.json ]; then
        echo "📝 Creating mount target at /app/package-lock.json..."
        touch /app/package-lock.json
    fi

    # Try to bind mount container's lock over host's lock
    echo "📌 Attempting to mount container's package-lock.json overlay..."
    if mount --bind "$CONTAINER_LOCK" /app/package-lock.json 2>/dev/null; then
        echo "✅ Package-lock overlay active (host's file remains untouched)"
        return 0
    else
        echo "⚠️  Cannot bind mount package-lock.json (CAP_SYS_ADMIN not granted)"
        echo "⚠️  Falling back to shared lock file mode"
        echo "⚠️  Container will use/modify host's package-lock.json"
        # Copy container's lock to host location if we have one and host doesn't
        if [ -f "$CONTAINER_LOCK" ] && [ ! -s /app/package-lock.json ]; then
            cp "$CONTAINER_LOCK" /app/package-lock.json
        fi
        return 1
    fi
}

# Set up the overlay first (before any npm operations)
# If it fails, we'll continue with shared lock file (non-fatal)
setup_lock_overlay || true

# Install if needed
if [ "$should_install" = true ]; then
    cd /app

    echo "📦 Running npm install (using container's package-lock.json)..."
    npm install

    # The bind mount ensures changes are written to $CONTAINER_LOCK automatically
    touch "$MARKER_FILE"
    echo "✅ npm install completed"
fi

# Clear Vite cache on every container start to prevent stale cache issues
if [ -d "/app/node_modules/.vite" ]; then
    echo "🧹 Clearing Vite cache..."
    rm -rf /app/node_modules/.vite
    echo "✅ Vite cache cleared"
fi

# Execute the main command
echo "🎬 Starting: $*"
exec "$@"
