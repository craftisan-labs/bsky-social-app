#!/bin/bash

# Quick setup script for app icons
# This script helps set up app icons for Amazon Appstore

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🎨 App Icon Setup for Amazon Appstore${NC}"
echo ""

# Check if source icon exists
SOURCE_ICON="assets/app-icons/bluefly-icon-512.png"
ALTERNATE_ICON="assets/app-icons/bluefly-logo-lg.png"

if [ -f "$SOURCE_ICON" ]; then
    ICON_TO_USE="$SOURCE_ICON"
    echo -e "${GREEN}✓ Found source icon: $SOURCE_ICON${NC}"
elif [ -f "$ALTERNATE_ICON" ]; then
    ICON_TO_USE="$ALTERNATE_ICON"
    echo -e "${GREEN}✓ Using existing icon: $ALTERNATE_ICON${NC}"
else
    echo -e "${YELLOW}⚠ No source icon found.${NC}"
    echo ""
    echo "Please place your 512x512px icon at one of these locations:"
    echo "  - $SOURCE_ICON (recommended)"
    echo "  - $ALTERNATE_ICON"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo ""
echo -e "${BLUE}Generating all Android icon sizes...${NC}"
echo ""

# Run the icon generation script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/generate-android-icons.sh" "$ICON_TO_USE"

echo ""
echo -e "${GREEN}✅ Icon setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify icons look correct in: android/app/src/main/res/mipmap-*/"
echo "  2. Rebuild the app: cd android && ./gradlew clean"
echo "  3. Test on device to ensure icons display correctly"
echo ""

