#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH="${PROJECT_PATH:-/var/www/api.jaib.co}"
BACKEND_DIR="${PROJECT_PATH}/backend"
BRANCH="${BRANCH:-main}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"
SYSTEMD_DIR="${SCRIPT_DIR}/systemd"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8000/up}"

ensure_project_directory() {
  echo "Ensuring project directory: ${PROJECT_PATH}"
  sudo mkdir -p "${PROJECT_PATH}"
  if id "${DEPLOY_USER}" &>/dev/null; then
    sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${PROJECT_PATH}"
  fi
}

require_git_repository() {
  if [ ! -d "${PROJECT_PATH}/.git" ]; then
    echo "No git repository at ${PROJECT_PATH}. Clone it first."
    exit 1
  fi
}

ensure_php() {
  if ! command -v "${PHP_BIN}" >/dev/null 2>&1; then
    echo "PHP not found (${PHP_BIN}). Install PHP 8.2+ before deploying."
    exit 1
  fi
  PHP_VERSION=$("${PHP_BIN}" -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
  PHP_MAJOR=$("${PHP_BIN}" -r 'echo PHP_MAJOR_VERSION;')
  PHP_MINOR=$("${PHP_BIN}" -r 'echo PHP_MINOR_VERSION;')
  if [ "${PHP_MAJOR}" -lt 8 ] || { [ "${PHP_MAJOR}" -eq 8 ] && [ "${PHP_MINOR}" -lt 2 ]; }; then
    echo "PHP 8.2+ required; found ${PHP_VERSION}"
    exit 1
  fi
  echo "Using PHP ${PHP_VERSION}"
}

ensure_composer() {
  if ! command -v "${COMPOSER_BIN}" >/dev/null 2>&1; then
    echo "Composer not found."
    exit 1
  fi
}

fix_laravel_permissions() {
  local web_group="${WEB_GROUP:-www-data}"
  local dirs=("${BACKEND_DIR}/storage" "${BACKEND_DIR}/bootstrap/cache")

  for dir in "${dirs[@]}"; do
    sudo mkdir -p "${dir}"
  done

  if getent group "${web_group}" >/dev/null 2>&1; then
    sudo chown -R "${DEPLOY_USER}:${web_group}" "${BACKEND_DIR}/storage" "${BACKEND_DIR}/bootstrap/cache"
    sudo chmod -R ug+rwx "${BACKEND_DIR}/storage" "${BACKEND_DIR}/bootstrap/cache"
  else
    sudo chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${BACKEND_DIR}/storage" "${BACKEND_DIR}/bootstrap/cache"
  fi
}

reload_web_services() {
  if systemctl list-unit-files nginx.service >/dev/null 2>&1; then
    echo "Reloading nginx..."
    if sudo nginx -t; then
      sudo systemctl reload nginx
    fi
  fi
}

verify_systemd_service() {
  local service_name="$1"
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    if curl -sf "${HEALTH_URL}" >/dev/null 2>&1; then
      echo "Service ${service_name} verified at ${HEALTH_URL}"
      return 0
    fi
  done
  echo "Health check failed for ${service_name}"
  return 1
}
