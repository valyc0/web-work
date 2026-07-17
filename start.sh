#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate

export WEBWORK_ROOT="${1:-$(pwd)}"
export WEBWORK_PORT="${2:-${WEBWORK_PORT:-8080}}"
python main.py
