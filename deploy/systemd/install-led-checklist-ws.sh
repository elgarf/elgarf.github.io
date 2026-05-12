#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="led-checklist-ws.service"
SERVICE_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_SRC="${SERVICE_SRC_DIR}/led-checklist-ws.service"
ENV_SRC="${SERVICE_SRC_DIR}/led-checklist-ws.env.example"
ENV_DST="/etc/default/led-checklist-ws"
SERVICE_DST="/etc/systemd/system/${SERVICE_NAME}"

if [[ ! -f "${SERVICE_SRC}" ]]; then
  echo "Missing ${SERVICE_SRC}" >&2
  exit 1
fi

sudo cp "${SERVICE_SRC}" "${SERVICE_DST}"

if [[ ! -f "${ENV_DST}" ]]; then
  sudo cp "${ENV_SRC}" "${ENV_DST}"
  echo "Created ${ENV_DST} from template. Review values before restart."
fi

sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager -l
