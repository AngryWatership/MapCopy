#!/bin/bash
# setup.sh — initialise MapCopy locally in WSL
# Usage: bash setup.sh
# Assumes: git configured with GitHub credentials, node 18+, python3

set -e

REPO_URL="https://github.com/AngryWatership/MapCopy.git"
LOCAL_DIR="/mnt/c/Users/PC MAROC/projects/MapCopy"

echo "==> Checking dependencies..."
command -v git     >/dev/null || { echo "git not found"; exit 1; }
command -v node    >/dev/null || { echo "node not found"; exit 1; }
command -v python3 >/dev/null || { echo "python3 not found"; exit 1; }

echo "==> Setting up repo at: $LOCAL_DIR"

if [ -d "$LOCAL_DIR/.git" ]; then
  echo "    Already a git repo — pulling latest"
  cd "$LOCAL_DIR"
  git pull origin main

elif [ -d "$LOCAL_DIR" ]; then
  echo "    Folder exists, no git — initialising in place"
  cd "$LOCAL_DIR"
  git init
  git remote add origin "$REPO_URL"
  git fetch origin main
  git checkout -b main --track origin/main 2>/dev/null \
    || git checkout main 2>/dev/null \
    || echo "    (continuing)"

else
  echo "    Fresh clone"
  git clone "$REPO_URL" "$LOCAL_DIR"
  cd "$LOCAL_DIR"
fi

echo "==> Installing node dependencies..."
npm install

echo "==> Verifying layout..."
python3 docs/mapcopy_layout.py

echo "==> Running tests..."
npm test

echo ""
echo "==> All checks passed."
echo ""
echo "    Local : $LOCAL_DIR"
echo "    Remote: $REPO_URL"
echo "    Live  : https://angrywatership.github.io/MapCopy"
echo ""
echo "    Open in VS Code:  code '$LOCAL_DIR'"
echo ""
echo "    Push:"
echo "      git add ."
echo "      git commit -m 'feat: initial implementation'"
echo "      git push origin main"
echo ""
echo "    Enable Pages: GitHub → Settings → Pages → Source → GitHub Actions"
