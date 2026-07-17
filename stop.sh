#!/bin/bash
PORT="${WEBWORK_PORT:-8080}"
fuser -k "$PORT/tcp" 2>/dev/null
echo "Server stopped"
