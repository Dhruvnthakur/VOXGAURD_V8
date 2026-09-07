#!/usr/bin/env bash
# VoxGuard Mobile — quick setup script
set -e

MOBILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$MOBILE_DIR"

echo "📦 Installing VoxGuard Mobile dependencies..."

# Try npm first, fall back to bun
if command -v npm &>/dev/null; then
  npm install
elif command -v bun &>/dev/null; then
  bun install
else
  echo "❌ Neither npm nor bun found. Please install Node.js."
  exit 1
fi

echo ""
echo "✅ Done! To start the app:"
echo ""
echo "  cd mobile"
echo "  npx expo start"
echo ""
echo "Then scan the QR code with the Expo Go app on your phone,"
echo "or press 'a' for Android emulator / 'i' for iOS simulator."
echo ""
echo "⚙️  Remember to set your backend URL in the app's Settings screen."
