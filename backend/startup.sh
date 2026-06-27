#!/bin/bash
# ============================================================
#  startup.sh  –  Manual EC2 bootstrap for Farmer Registration API
#  Run as:  sudo bash startup.sh
#  Edit the VARIABLES section below before running.
# ============================================================
set -e

# ── VARIABLES — fill these in before running ─────────────────
DATABASE_URL="postgresql://geoportal_user:yourpassword@your-rds-endpoint.rds.amazonaws.com:5432/geoportal_db"
S3_BUCKET_NAME="geoportal-uploads-xxxxxxxx"
S3_BASE_URL="https://geoportal-uploads-xxxxxxxx.s3.ap-south-1.amazonaws.com"
AWS_REGION="ap-south-1"
APP_DIR="/opt/geoportal"
# ─────────────────────────────────────────────────────────────

echo "==> [1/7] Updating system packages..."
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3-pip git

echo "==> [2/7] Creating app directory at $APP_DIR..."
mkdir -p "$APP_DIR"

echo "==> [3/7] Copying backend code..."
# If you are running this from the project root after cloning:
cp -r "$(dirname "$0")"/. "$APP_DIR/"
# Or if you cloned the repo separately, replace the line above with:
# git clone https://github.com/YOUR_ORG/YOUR_REPO.git "$APP_DIR"

echo "==> [4/7] Creating Python virtual environment..."
python3.11 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/requirements.txt"

echo "==> [5/7] Writing .env file..."
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
S3_BUCKET_NAME=${S3_BUCKET_NAME}
S3_BASE_URL=${S3_BASE_URL}
AWS_REGION=${AWS_REGION}
EOF
chmod 600 "$APP_DIR/.env"

echo "==> [6/7] Creating systemd service..."
cat > /etc/systemd/system/geoportal.service <<EOF
[Unit]
Description=Geoportal FastAPI App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> [7/7] Starting service..."
systemctl daemon-reload
systemctl enable geoportal
systemctl restart geoportal

echo ""
echo "================================================================"
echo " Deployment complete!"
echo " API running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
echo " Check logs:     journalctl -u geoportal -f"
echo "================================================================"
