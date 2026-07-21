#!/bin/sh
# Generate self-signed SSL certificate for HTTPS in dev environment
# Certificates are stored in a persistent volume so they survive container restarts

CERT_DIR="/app/.cache/ssl"
CA_KEY="$CERT_DIR/ca.key"
CA_CERT="$CERT_DIR/ca.crt"
SERVER_KEY="$CERT_DIR/server.key"
SERVER_CERT="$CERT_DIR/server.crt"
SERVER_CSR="$CERT_DIR/server.csr"

mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$SERVER_CERT" ] && [ -f "$SERVER_KEY" ]; then
  echo "[SSL] Using existing certificates from $CERT_DIR"
  exit 0
fi

echo "[SSL] Generating self-signed SSL certificates..."

# Install OpenSSL if not present
if ! command -v openssl >/dev/null 2>&1; then
  echo "[SSL] Installing OpenSSL..."
  apk add --no-cache openssl
fi

# Generate CA private key
echo "[SSL] Creating Certificate Authority..."
openssl genrsa -out "$CA_KEY" 2048 2>/dev/null

# Generate CA certificate (valid for 10 years)
openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days 3650 \
  -out "$CA_CERT" \
  -subj "/C=US/ST=Dev/L=Local/O=Astro Blog Dev/CN=Astro Blog Development CA" \
  2>/dev/null

# Generate server private key
echo "[SSL] Creating server certificate..."
openssl genrsa -out "$SERVER_KEY" 2048 2>/dev/null

# Get hostname/IP for certificate
# VITE_HMR_HOST is the hostname users will use to access this dev server
# (e.g., "myserver.local" or "192.168.1.100")
# Falls back to localhost if not specified
HOSTNAME="${VITE_HMR_HOST:-localhost}"
# Extract hostname from URL if it's a full URL
HOSTNAME=$(echo "$HOSTNAME" | sed -E 's|^https?://||' | sed -E 's|/.*$||' | sed -E 's|:.*$||')

# Create OpenSSL config for SAN (Subject Alternative Names)
cat > "$CERT_DIR/openssl.cnf" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = Dev
L = Local
O = Astro Blog Dev
CN = $HOSTNAME

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $HOSTNAME
DNS.2 = localhost
DNS.3 = *.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate Certificate Signing Request (CSR)
openssl req -new -key "$SERVER_KEY" -out "$SERVER_CSR" \
  -config "$CERT_DIR/openssl.cnf" \
  2>/dev/null

# Sign the server certificate with our CA (valid for 2 years)
openssl x509 -req -in "$SERVER_CSR" -CA "$CA_CERT" -CAkey "$CA_KEY" \
  -CAcreateserial -out "$SERVER_CERT" -days 730 -sha256 \
  -extensions v3_req -extfile "$CERT_DIR/openssl.cnf" \
  2>/dev/null

# Clean up CSR and config
rm -f "$SERVER_CSR" "$CERT_DIR/openssl.cnf" "$CERT_DIR/ca.srl"

# Set permissions
chmod 644 "$CA_CERT" "$SERVER_CERT"
chmod 600 "$CA_KEY" "$SERVER_KEY"

echo "[SSL] ✓ Certificates generated successfully"
echo "[SSL] Certificate valid for: $HOSTNAME, localhost, *.local"
echo "[SSL]"
echo "[SSL] To eliminate browser security warnings, users should:"
echo "[SSL] 1. Visit https://$HOSTNAME:4321/admin/ssl-setup"
echo "[SSL] 2. Download and trust the CA certificate"
echo "[SSL]"

exit 0
