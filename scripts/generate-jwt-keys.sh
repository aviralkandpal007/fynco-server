#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYS_DIR="$ROOT_DIR/keys"

mkdir -p "$KEYS_DIR"

ACCESS_PRIV="$KEYS_DIR/access_token_private.pem"
ACCESS_PUB="$KEYS_DIR/access_token_public.pem"
REFRESH_PRIV="$KEYS_DIR/refresh_token_private.pem"
REFRESH_PUB="$KEYS_DIR/refresh_token_public.pem"

openssl genrsa -out "$ACCESS_PRIV" 2048
openssl rsa -in "$ACCESS_PRIV" -pubout -out "$ACCESS_PUB"

openssl genrsa -out "$REFRESH_PRIV" 2048
openssl rsa -in "$REFRESH_PRIV" -pubout -out "$REFRESH_PUB"

chmod 600 "$ACCESS_PRIV" "$REFRESH_PRIV"
chmod 644 "$ACCESS_PUB" "$REFRESH_PUB"

echo "JWT keys generated in $KEYS_DIR"
