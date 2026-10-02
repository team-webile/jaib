#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_PATH="${PROJECT_PATH:-/var/www/api.jaib.co}"
BRANCH="${BRANCH:-main}"

source "${SCRIPT_DIR}/lib.sh"

echo "======================================"
echo "Jaib Backend Deployment (Laravel)"
echo "======================================"

ensure_project_directory
require_git_repository

cd "${PROJECT_PATH}"

if [ ! -f ".env" ]; then
  echo "ERROR: backend/.env not found. Copy from backend/.env.example and configure it first."
  exit 1
fi

ensure_php
ensure_composer

maintenance_up() {
  "${PHP_BIN}" artisan up 2>/dev/null || true
}
trap maintenance_up EXIT

echo "Enabling maintenance mode..."
"${PHP_BIN}" artisan down --refresh=15 --retry=60 || true

echo "Installing Composer dependencies..."
COMPOSER_ALLOW_SUPERUSER=1 "${COMPOSER_BIN}" install \
  --no-dev \
  --prefer-dist \
  --no-interaction \
  --optimize-autoloader

echo "Caching configuration..."
"${PHP_BIN}" artisan config:clear 2>/dev/null || true
"${PHP_BIN}" artisan config:cache
"${PHP_BIN}" artisan route:clear
"${PHP_BIN}" artisan route:cache
"${PHP_BIN}" artisan view:cache

fix_laravel_permissions

# Restart Octane if running
if sudo systemctl is-active --quiet jaib-octane.service 2>/dev/null; then
  echo "Restarting jaib-octane.service..."
  sudo systemctl restart jaib-octane.service
  verify_systemd_service "jaib-octane.service"
else
  echo "Starting jaib-octane.service..."
  sudo systemctl start jaib-octane.service
  verify_systemd_service "jaib-octane.service"
fi

reload_web_services

trap - EXIT
echo "Disabling maintenance mode..."
"${PHP_BIN}" artisan up

echo "Backend deployment complete."
