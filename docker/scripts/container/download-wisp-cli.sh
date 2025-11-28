#!/bin/sh
# Download wisp-cli with caching and fallback
#
# This script handles the patchy availability of wisp-cli by:
# 1. Attempting to download from the remote URL
# 2. Validating the download (not empty, not HTML error page)
# 3. Caching successful downloads
# 4. Falling back to cached version if download fails

WISP_CLI_URL="https://sites.wisp.place/nekomimi.pet/wisp-cli-binaries/wisp-cli-x86_64-linux"
CACHE_DIR="/cache/wisp-cli"
CACHE_FILE="$CACHE_DIR/wisp-cli"
TARGET_FILE="/build-service/wisp-cli"
MIN_FILE_SIZE=100000  # Minimum expected size in bytes (wisp-cli should be ~2MB+)

mkdir -p "$CACHE_DIR"

echo "[wisp-cli] Attempting to download from $WISP_CLI_URL"

# Download to a temp file first
TEMP_FILE=$(mktemp)
HTTP_CODE=$(curl -sL -w "%{http_code}" -o "$TEMP_FILE" "$WISP_CLI_URL" 2>/dev/null)

# Check if download succeeded
DOWNLOAD_OK=false

if [ "$HTTP_CODE" = "200" ]; then
    # Check file size - should be at least MIN_FILE_SIZE bytes for a real binary
    FILE_SIZE=$(wc -c < "$TEMP_FILE" 2>/dev/null | tr -d ' ')

    if [ "$FILE_SIZE" -gt "$MIN_FILE_SIZE" ] 2>/dev/null; then
        # Check it's not an HTML error page (first bytes should be ELF header for Linux binary)
        MAGIC=$(head -c 4 "$TEMP_FILE" 2>/dev/null | od -An -tx1 | tr -d ' ')
        if [ "$MAGIC" = "7f454c46" ]; then
            # ELF binary - valid download
            echo "[wisp-cli] Download successful (${FILE_SIZE} bytes, ELF binary)"
            DOWNLOAD_OK=true
        else
            echo "[wisp-cli] Downloaded file is not an ELF binary (magic: $MAGIC)"
        fi
    else
        echo "[wisp-cli] Downloaded file too small (${FILE_SIZE} bytes, expected > ${MIN_FILE_SIZE})"
    fi
else
    echo "[wisp-cli] Download failed with HTTP code: $HTTP_CODE"
fi

if [ "$DOWNLOAD_OK" = "true" ]; then
    # Move to target and update cache
    mv "$TEMP_FILE" "$TARGET_FILE"
    chmod +x "$TARGET_FILE"
    cp "$TARGET_FILE" "$CACHE_FILE"
    echo "[wisp-cli] Installed and cached successfully"
elif [ -f "$CACHE_FILE" ]; then
    # Fall back to cached version
    echo "[wisp-cli] Using cached version"
    cp "$CACHE_FILE" "$TARGET_FILE"
    chmod +x "$TARGET_FILE"
    rm -f "$TEMP_FILE"
else
    # No cache available - create a stub that prints an error
    echo "[wisp-cli] WARNING: Download failed and no cached version available"
    echo "[wisp-cli] Creating stub script that will report the error at runtime"
    rm -f "$TEMP_FILE"
    cat > "$TARGET_FILE" << 'EOF'
#!/bin/sh
echo "ERROR: wisp-cli is not available"
echo "The wisp-cli binary could not be downloaded and no cached version exists."
echo "Please check https://sites.wisp.place/nekomimi.pet/wisp-cli-binaries/ availability"
exit 1
EOF
    chmod +x "$TARGET_FILE"
fi

# Verify installation
if [ -x "$TARGET_FILE" ]; then
    echo "[wisp-cli] Installation complete: $TARGET_FILE"
    ls -la "$TARGET_FILE"
else
    echo "[wisp-cli] ERROR: Installation failed"
    exit 1
fi