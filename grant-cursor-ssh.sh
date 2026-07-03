#!/usr/bin/env bash
# Grants temporary SSH key access for Cursor agent (default: 2 hours).
# Run from project root. You will be prompted for the server root password once.

set -euo pipefail

SERVER_HOST="${SERVER_HOST:-45.85.146.123}"
SERVER_USER="${SERVER_USER:-root}"
SERVER="${SERVER_USER}@${SERVER_HOST}"
DURATION_HOURS="${DURATION_HOURS:-2}"
KEY_COMMENT="cursor-temp-access"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
KEY_DIR="${PROJECT_ROOT}/.cursor-ssh"
KEY_FILE="${KEY_DIR}/cursor_temp_key"
PUB_FILE="${KEY_FILE}.pub"

echo "=============================================="
echo " Cursor temporary SSH access — ${DURATION_HOURS}h"
echo " Server: ${SERVER}"
echo "=============================================="
echo ""

mkdir -p "${KEY_DIR}"
chmod 700 "${KEY_DIR}"

if [[ ! -f "${KEY_FILE}" ]]; then
  echo "→ Generating temporary SSH key..."
  ssh-keygen -t ed25519 -f "${KEY_FILE}" -N "" -C "${KEY_COMMENT}-$(date +%Y%m%d%H%M%S)"
else
  echo "→ Using existing temporary key at ${KEY_FILE}"
fi

chmod 600 "${KEY_FILE}"
chmod 644 "${PUB_FILE}"

PUB_KEY="$(cat "${PUB_FILE}")"
MARKER="# ${KEY_COMMENT}"

echo ""
echo "→ Installing public key on ${SERVER} (enter root password when prompted)..."
echo ""

ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no "${SERVER}" bash -s <<REMOTE
set -e
MARKER='${MARKER}'
PUB_KEY='${PUB_KEY}'
DURATION_HOURS='${DURATION_HOURS}'

mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Remove any previous cursor temp keys
grep -v "${KEY_COMMENT}" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp || true
mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys

echo "\${PUB_KEY} \${MARKER}" >> ~/.ssh/authorized_keys

# Schedule key removal after DURATION_HOURS
REMOVE_CMD="grep -v '${KEY_COMMENT}' /root/.ssh/authorized_keys > /root/.ssh/authorized_keys.tmp && mv /root/.ssh/authorized_keys.tmp /root/.ssh/authorized_keys"

if command -v at >/dev/null 2>&1; then
  echo "\${REMOVE_CMD}" | at now + \${DURATION_HOURS} hours 2>/dev/null && echo "→ Key auto-removal scheduled via 'at' in \${DURATION_HOURS} hours."
else
  (
    sleep \$((DURATION_HOURS * 3600))
    eval "\${REMOVE_CMD}"
  ) >/dev/null 2>&1 &
  echo \$! > /tmp/cursor-ssh-revoke.pid
  echo "→ Key auto-removal background job started (PID \$(cat /tmp/cursor-ssh-revoke.pid)) for \${DURATION_HOURS} hours."
fi

echo "→ Temporary key installed successfully."
REMOTE

echo ""
echo "→ Verifying key login..."
ssh -i "${KEY_FILE}" \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  "${SERVER}" "echo 'SSH key login OK on $(hostname)'"

echo ""
echo "=============================================="
echo " SUCCESS — Cursor can now SSH for ~${DURATION_HOURS} hours"
echo " Key: ${KEY_FILE}"
echo " Test: ssh -i ${KEY_FILE} ${SERVER}"
echo "=============================================="
echo ""
echo "The key will be removed from the server automatically after ${DURATION_HOURS} hours."
echo "To revoke immediately: ssh ${SERVER} \"grep -v '${KEY_COMMENT}' ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp && mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys\""
