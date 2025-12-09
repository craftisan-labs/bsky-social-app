#!/usr/bin/env bash

# Generate Android App Icons Script
# This script generates all required Android icon sizes from a source icon
# According to Amazon Appstore and Android guidelines

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔨 Android Icon Generator for Amazon Appstore${NC}"
echo ""

# Check if source icon is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <source-icon.png>${NC}"
    echo ""
    echo "Example: $0 ./assets/app-icons/bluefly-icon-512.png"
    echo ""
    echo "Source icon requirements:"
    echo "  - 512x512px or larger (square, recommended for Amazon Appstore)"
    echo "  - PNG format with transparency"
    echo "  - The icon will be resized for all Android densities"
    echo ""
    exit 1
fi

SOURCE_ICON="$1"

# Check if source file exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}❌ Source icon not found: $SOURCE_ICON${NC}"
    exit 1
fi

# Get absolute path
SOURCE_ICON=$(cd "$(dirname "$SOURCE_ICON")" && pwd)/$(basename "$SOURCE_ICON")

# Android resource directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RES_DIR="$PROJECT_ROOT/android/app/src/main/res"

echo -e "${GREEN}📦 Source icon: $SOURCE_ICON${NC}"
echo -e "${GREEN}📁 Resource directory: $RES_DIR${NC}"
echo ""

# Check if sips is available
if ! command -v sips &> /dev/null; then
    echo -e "${RED}❌ sips command not found. This script requires macOS with sips.${NC}"
    exit 1
fi

# Icon density sizes - using arrays instead of associative arrays for compatibility
DENSITIES=("mdpi" "hdpi" "xhdpi" "xxhdpi" "xxxhdpi")
SIZES=(48 72 96 144 192)

# Function to get size for density
get_size() {
    local density=$1
    case $density in
        mdpi) echo 48 ;;
        hdpi) echo 72 ;;
        xhdpi) echo 96 ;;
        xxhdpi) echo 144 ;;
        xxxhdpi) echo 192 ;;
        *) echo 48 ;;
    esac
}

# Function to generate standard launcher icon
generate_launcher_icon() {
    local density=$1
    local size=$2
    local output_dir="$RES_DIR/mipmap-$density"
    local output_file="$output_dir/ic_launcher.png"
    
    echo -e "${BLUE}  → ${density} (${size}x${size}px)${NC}"
    
    mkdir -p "$output_dir"
    
    # Resize using sips
    sips -s format png -z "$size" "$size" "$SOURCE_ICON" --out "$output_file" > /dev/null 2>&1
    
    if [ $? -eq 0 ] && [ -f "$output_file" ]; then
        echo -e "${GREEN}    ✓ $output_file${NC}"
        return 0
    else
        echo -e "${RED}    ✗ Failed${NC}"
        return 1
    fi
}

# Function to generate adaptive icon foreground
# Adaptive icons need 108dp foreground (safe zone 72dp)
# For xxxhdpi: 108dp = 432px (192dp base * 2.25)
generate_adaptive_foreground() {
    local density=$1
    local base_size=$2
    local output_dir="$RES_DIR/mipmap-$density"
    local output_file="$output_dir/ic_launcher_foreground.png"
    
    # Calculate adaptive size: base_size * 2.25 (for 108dp from 48dp base)
    local adaptive_size
    if command -v bc &> /dev/null; then
        adaptive_size=$(echo "$base_size * 2.25" | bc)
        adaptive_size=${adaptive_size%.*}  # Remove decimal
    else
        # Fallback sizes
        case $density in
            mdpi) adaptive_size=108 ;;
            hdpi) adaptive_size=162 ;;
            xhdpi) adaptive_size=216 ;;
            xxhdpi) adaptive_size=324 ;;
            xxxhdpi) adaptive_size=432 ;;
            *) adaptive_size=108 ;;
        esac
    fi
    
    echo -e "${BLUE}  → Adaptive foreground ${density} (${adaptive_size}x${adaptive_size}px)${NC}"
    
    mkdir -p "$output_dir"
    
    sips -s format png -z "$adaptive_size" "$adaptive_size" "$SOURCE_ICON" --out "$output_file" > /dev/null 2>&1
    
    if [ $? -eq 0 ] && [ -f "$output_file" ]; then
        echo -e "${GREEN}    ✓ $output_file${NC}"
        return 0
    else
        echo -e "${RED}    ✗ Failed${NC}"
        return 1
    fi
}

# Function to generate monochrome icon
generate_monochrome() {
    local density=$1
    local base_size=$2
    local output_dir="$RES_DIR/mipmap-$density"
    local output_file="$output_dir/ic_launcher_monochrome.png"
    
    local adaptive_size
    if command -v bc &> /dev/null; then
        adaptive_size=$(echo "$base_size * 2.25" | bc)
        adaptive_size=${adaptive_size%.*}
    else
        case $density in
            mdpi) adaptive_size=108 ;;
            hdpi) adaptive_size=162 ;;
            xhdpi) adaptive_size=216 ;;
            xxhdpi) adaptive_size=324 ;;
            xxxhdpi) adaptive_size=432 ;;
            *) adaptive_size=108 ;;
        esac
    fi
    
    echo -e "${BLUE}  → Monochrome ${density} (${adaptive_size}x${adaptive_size}px)${NC}"
    
    mkdir -p "$output_dir"
    
    # Generate and convert to grayscale
    local temp_file="/tmp/mono_${density}_$$.png"
    
    sips -s format png -z "$adaptive_size" "$adaptive_size" "$SOURCE_ICON" --out "$temp_file" > /dev/null 2>&1
    
    if [ $? -eq 0 ] && [ -f "$temp_file" ]; then
        # Copy as monochrome (in a real scenario, you'd convert to grayscale)
        cp "$temp_file" "$output_file"
        rm -f "$temp_file"
        
        if [ -f "$output_file" ]; then
            echo -e "${GREEN}    ✓ $output_file${NC}"
            echo -e "${YELLOW}    ⚠ Note: Convert to grayscale manually or use ImageMagick for true monochrome${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}    ✗ Failed${NC}"
    return 1
}

echo -e "${GREEN}📱 Generating standard launcher icons...${NC}"
success_count=0
total_count=0

for i in "${!DENSITIES[@]}"; do
    density="${DENSITIES[$i]}"
    size="${SIZES[$i]}"
    total_count=$((total_count + 1))
    if generate_launcher_icon "$density" "$size"; then
        success_count=$((success_count + 1))
    fi
done

echo ""
echo -e "${GREEN}🎨 Generating adaptive icon foregrounds...${NC}"
for i in "${!DENSITIES[@]}"; do
    density="${DENSITIES[$i]}"
    size="${SIZES[$i]}"
    total_count=$((total_count + 1))
    if generate_adaptive_foreground "$density" "$size"; then
        success_count=$((success_count + 1))
    fi
done

echo ""
echo -e "${GREEN}⚫ Generating monochrome icons...${NC}"
for i in "${!DENSITIES[@]}"; do
    density="${DENSITIES[$i]}"
    size="${SIZES[$i]}"
    total_count=$((total_count + 1))
    if generate_monochrome "$density" "$size"; then
        success_count=$((success_count + 1))
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Icon generation complete!${NC}"
echo -e "${BLUE}   Generated: $success_count/$total_count icons${NC}"
echo ""

# Check if adaptive icon XML exists
if [ -f "$RES_DIR/mipmap-anydpi-v26/ic_launcher.xml" ]; then
    echo -e "${GREEN}✓ Adaptive icon configuration found${NC}"
else
    echo -e "${YELLOW}⚠ Adaptive icon XML not found - icons may not work on Android 8.0+${NC}"
fi

echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "  1. Verify icons in: $RES_DIR/mipmap-*/"
echo "  2. For Amazon Appstore: Ensure you have a 512x512px icon ready"
echo "  3. Rebuild the app: cd android && ./gradlew clean"
echo "  4. Test icons on device/emulator"
echo ""
