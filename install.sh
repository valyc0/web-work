#!/usr/bin/env bash
set -e

echo "=== WebWork Install ==="
echo ""

if [ ! -d ".venv" ]; then
    echo "Creating .venv..."
    python3 -m venv .venv
fi

echo "Activating .venv..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "Done! Run ./start.sh to launch."
