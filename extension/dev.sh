#!/bin/bash

# Development deployment script for VSCode Extension
# This script compiles, packages, and installs the extension

set -e

echo "🔨 Compiling TypeScript..."
npm run compile

echo "📦 Packaging extension..."
npx vsce package --no-dependencies

echo "📥 Installing extension..."
code --install-extension *.vsix --force

echo "✅ Done! Reload VSCode window to see changes."
echo "   Press Ctrl+Shift+P -> 'Developer: Reload Window'"
