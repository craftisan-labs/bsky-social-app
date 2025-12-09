#!/bin/bash

# Build script for Fire TV APK
# Run this after installing Java JDK 17

set -e

echo "🔨 Building Fire TV APK..."

# Set JAVA_HOME if not already set
if [ -z "$JAVA_HOME" ]; then
  if [ -d "/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home" ]; then
    export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
    echo "✅ Set JAVA_HOME to: $JAVA_HOME"
  elif [ -d "/opt/homebrew/Caskroom/zulu@17" ]; then
    # Find the latest zulu@17 installation
    ZULU_PATH=$(find /opt/homebrew/Caskroom/zulu@17 -name "Contents" -type d | head -1 | xargs dirname)
    if [ -n "$ZULU_PATH" ]; then
      export JAVA_HOME="$ZULU_PATH/Contents/Home"
      echo "✅ Set JAVA_HOME to: $JAVA_HOME"
    fi
  else
    echo "❌ Java JDK 17 not found. Please install it first:"
    echo "   brew install --cask zulu@17"
    exit 1
  fi
fi

# Verify Java is available
if ! command -v java &> /dev/null; then
  echo "❌ Java not found in PATH. Please add Java to your PATH or set JAVA_HOME"
  exit 1
fi

echo "✅ Java version:"
java -version

# Navigate to android directory
cd "$(dirname "$0")/../android"

echo ""
echo "🧹 Cleaning previous builds..."
./gradlew clean

echo ""
echo "🔨 Building release APK..."
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 APK location:"
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo "   $(pwd)/$APK_PATH"
  echo ""
  echo "📊 APK size:"
  ls -lh "$APK_PATH" | awk '{print "   " $5}'
  echo ""
  echo "🚀 To install on Fire TV:"
  echo "   1. Enable ADB on Fire TV (Settings → Developer Options)"
  echo "   2. Connect: adb connect <FIRE_TV_IP>"
  echo "   3. Install: adb install $APK_PATH"
else
  echo "   ❌ APK not found at expected location"
  exit 1
fi

