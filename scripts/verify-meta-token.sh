#!/usr/bin/env bash
# Quick helper to probe the running BIA server meta-ads connector
# Usage: ./scripts/verify-meta-token.sh [host] [port]
# Example: ./scripts/verify-meta-token.sh localhost 3001

HOST=${1:-localhost}
PORT=${2:-3001}

set -euo pipefail

URL="http://${HOST}:${PORT}/api/connectors/meta-ads/verify?probe=1&debug=1"

echo "Probing Meta Ads connector: ${URL}"
curl -sS -X GET "${URL}" -H "Accept: application/json" | jq '.' || true

echo "(If response shows status REAL and connector account_id, token is valid.)"
