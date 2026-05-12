#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/admin/web/static.93.189.179.185.ip.webhost1.net/public_html}"
BRANCH="${BRANCH:-tools}"
SERVICE_NAME="${SERVICE_NAME:-led-checklist-ws.service}"

echo "[deploy] repo: ${REPO_DIR}"
echo "[deploy] branch: ${BRANCH}"

cd "${REPO_DIR}"

echo "[deploy] fetch/pull"
git fetch origin
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

if [[ -f "${REPO_DIR}/deploy/systemd/led-checklist-ws.service" ]]; then
  echo "[deploy] install systemd unit"
  sudo cp "${REPO_DIR}/deploy/systemd/led-checklist-ws.service" "/etc/systemd/system/${SERVICE_NAME}"
fi

if [[ ! -f /etc/default/led-checklist-ws && -f "${REPO_DIR}/deploy/systemd/led-checklist-ws.env.example" ]]; then
  echo "[deploy] create /etc/default/led-checklist-ws from template"
  sudo cp "${REPO_DIR}/deploy/systemd/led-checklist-ws.env.example" /etc/default/led-checklist-ws
fi

echo "[deploy] daemon-reload"
sudo systemctl daemon-reload

echo "[deploy] enable/restart ${SERVICE_NAME}"
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo "[deploy] status"
sudo systemctl status "${SERVICE_NAME}" --no-pager -l

echo "[deploy] done"
