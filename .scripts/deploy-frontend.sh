#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH="${PROJECT_PATH:-/var/www/jaib.co}"
APP_DIR="${APP_DIR:-/var/www/jaib.co/.next-app}"
BRANCH="${BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-jaib-frontend}"
PM2_INSTANCES="${PM2_INSTANCES:-4}"

NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.jaib.co}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://jaib.co}"
BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://127.0.0.1:8000/api}"

echo "======================================"
echo "Jaib Frontend Deployment (Next.js)"
echo "======================================"
echo "  project:  ${PROJECT_PATH}"
echo "  app:      ${APP_DIR}"
echo "  pm2 app:  ${PM2_APP_NAME}"
echo ""

step_done() { echo "  done in $(($(date +%s) - STEP_TS))s"; }
STEP_TS=$(date +%s)

# --- Pull ---
echo "[1/5] Pulling ${BRANCH}..."
STEP_TS=$(date +%s)
sudo -u ubuntu -H bash -c "
  set -e
  eval \$(ssh-agent -s)
  ssh-add ~/.ssh/id_rsa 2>/dev/null || true
  cd '${PROJECT_PATH}'
  git fetch --prune origin
  git reset --hard 'origin/${BRANCH}'
  git config --local core.sparseCheckout true
  git sparse-checkout init --cone 2>/dev/null || true
  git sparse-checkout set frontend .scripts
"
step_done

# --- Build ---
echo "[2/5] npm ci + next build..."
STEP_TS=$(date +%s)
cd "${PROJECT_PATH}/frontend"
sudo -u ubuntu -H bash -c "
  set -e
  cd '${PROJECT_PATH}/frontend'
  rm -rf node_modules
  npm install --no-audit --no-fund 2>&1 | tail -5
  export NEXT_PUBLIC_API_URL='${NEXT_PUBLIC_API_URL}'
  export NEXT_PUBLIC_APP_URL='${NEXT_PUBLIC_APP_URL}'
  export BACKEND_INTERNAL_URL='${BACKEND_INTERNAL_URL}'
  npm run build 2>&1 | tail -15
"
step_done

# --- Swap ---
echo "[3/5] Swapping build into ${APP_DIR}..."
STEP_TS=$(date +%s)
sudo mkdir -p "${APP_DIR}"
sudo cp -a "${PROJECT_PATH}/frontend/.next/standalone/." "${APP_DIR}/"
sudo mkdir -p "${APP_DIR}/.next"
sudo cp -a "${PROJECT_PATH}/frontend/.next/static/." "${APP_DIR}/.next/static/"
[ -d "${PROJECT_PATH}/frontend/public" ] && \
  sudo cp -a "${PROJECT_PATH}/frontend/public" "${APP_DIR}/public"
sudo chown -R ubuntu:ubuntu "${APP_DIR}"
step_done

# --- PM2 reload ---
echo "[4/5] Reloading pm2 (${PM2_APP_NAME})..."
STEP_TS=$(date +%s)
cd "${APP_DIR}"
sudo -u ubuntu -H bash -c "
  set -e
  cd '${APP_DIR}'
  ONLINE=\$(pm2 jlist 2>/dev/null | node -e '
    let d=\"\";
    process.stdin.on(\"data\",c=>d+=c).on(\"end\",()=>{
      try {
        const apps = JSON.parse(d);
        const n = apps.filter(a => a.name === \"${PM2_APP_NAME}\" && a.pm2_env?.status === \"online\").length;
        process.stdout.write(String(n));
      } catch (e) { process.stdout.write(\"0\"); }
    });
  ')

  if [ \"\${ONLINE}\" -eq 0 ]; then
    echo \"  cold start\"
    pm2 delete '${PM2_APP_NAME}' 2>/dev/null || true
    pm2 start ecosystem.config.cjs --env production --update-env 2>&1 | tail -5
  else
    echo \"  graceful reload (\${ONLINE} workers)\"
    pm2 reload ecosystem.config.cjs --env production --update-env 2>&1 | tail -5
  fi
  pm2 save >/dev/null 2>&1 || true
"
step_done

# --- Verify ---
echo "[5/5] Verifying..."
STEP_TS=$(date +%s)
if sudo -u ubuntu pm2 show "${PM2_APP_NAME}" >/dev/null 2>&1; then
  STATUS=$(sudo -u ubuntu pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  pm2: ${PM2_APP_NAME} is ${STATUS}"
  [ "${STATUS}" = "online" ] || { echo "  FAILED: not online"; exit 1; }
else
  echo "  FAILED: ${PM2_APP_NAME} not in process list"
  exit 1
fi

LOCAL_HTTP=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/" || echo "000")
echo "  http://127.0.0.1:3000/ -> HTTP ${LOCAL_HTTP}"
[ "${LOCAL_HTTP}" != "000" ] || { echo "Local HTTP check failed"; exit 1; }
step_done

echo ""
echo "Frontend deployment complete."
