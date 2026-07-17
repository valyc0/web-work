#!/usr/bin/env bash
set -e

echo "=== WebWork Builder ==="
echo ""

# Detect current platform
ARCH=$(uname -m)
OS=$(uname -s)

case "$OS" in
    Linux)  DEFAULT_PLATFORM="linux" ;;
    Darwin) DEFAULT_PLATFORM="macos" ;;
    MINGW*|MSYS*|CYGWIN*) DEFAULT_PLATFORM="windows" ;;
    *)      DEFAULT_PLATFORM="unknown" ;;
esac

echo "Detected platform: $OS $ARCH"
echo ""
echo "Target platforms:"
echo "  1) linux    - Linux (x86_64)"
echo "  2) macos    - macOS (arm64/x86_64)"
echo "  3) windows  - Windows (.exe)"
echo ""

if [ "$DEFAULT_PLATFORM" = "linux" ]; then
    HINT="(current)"
elif [ "$DEFAULT_PLATFORM" = "macos" ]; then
    HINT="(current)"
elif [ "$DEFAULT_PLATFORM" = "windows" ]; then
    HINT="(current)"
else
    HINT=""
fi

read -p "Select platform [1]: " CHOICE
CHOICE=${CHOICE:-1}

case "$CHOICE" in
    1) TARGET="linux"; EXT="" ;;
    2) TARGET="macos"; EXT="" ;;
    3) TARGET="windows"; EXT=".exe" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

echo ""
echo "Building for: $TARGET"

if [ "$TARGET" != "$DEFAULT_PLATFORM" ]; then
    echo "WARNING: Cross-compilation is NOT supported by PyInstaller."
    echo "The build will produce a $DEFAULT_PLATFORM binary, not $TARGET."
    echo "To build for $TARGET, run this script on a $TARGET machine."
    echo ""
    read -p "Continue anyway? [y/N]: " CONFIRM
    [ "$CONFIRM" = "y" ] || exit 0
fi

echo ""
echo "Checking PyInstaller..."

# Activate venv if present
if [ -f ".venv/bin/activate" ]; then
    echo "Activating .venv..."
    source .venv/bin/activate
fi

if ! command -v pyinstaller &>/dev/null; then
    echo "PyInstaller not found. Installing..."
    pip install pyinstaller
fi

echo ""
echo "Cleaning previous builds..."
rm -rf dist/ build/ *.spec

echo ""
echo "Building..."
pyinstaller \
    --onefile \
    --name "webwork${EXT}" \
    --add-data "static:static" \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols \
    --hidden-import uvicorn.protocols.http \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.lifespan \
    --hidden-import uvicorn.lifespan.on \
    main.py

echo ""
echo "Done! Binary at: dist/webwork${EXT}"
ls -lh "dist/webwork${EXT}"
