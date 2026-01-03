#!/bin/bash

# =========================================================
# AirBamin - macOS Build Script
# Creates DMG installers for Apple Silicon and Intel Macs
# =========================================================

set -e

# Configuration
APP_NAME="Airbamin"
# Extract version from pom.xml dynamically
APP_VERSION=$(grep -m1 '<version>' pom.xml | sed 's/.*<version>\(.*\)<\/version>.*/\1/')
VENDOR="Tecbamin"
MAIN_JAR="airbamin-desktop-${APP_VERSION}.jar"
MAIN_CLASS="com.airbamin.desktop.Launcher"
MAC_PACKAGE_ID="com.tecbamin.airbamin"
ICON_PATH="src/main/resources/favicon_io/airbamin.icns"

# Detect current architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    ARCH_NAME="aarch64"
    echo "Detected Apple Silicon (arm64)"
else
    ARCH_NAME="x64"
    echo "Detected Intel (x86_64)"
fi

# Check JAVA_HOME
if [ -z "$JAVA_HOME" ]; then
    echo "Error: JAVA_HOME is not set."
    echo "Please install JDK 17+ and set JAVA_HOME."
    exit 1
fi

echo ""
echo "========================================================"
echo "  Building ${APP_NAME} ${APP_VERSION} for macOS (${ARCH_NAME})"
echo "========================================================"
echo ""

# 1. Clean and Package with Maven
echo "[1/4] Running Maven Clean Package..."
mvn clean package -DskipTests

if [ $? -ne 0 ]; then
    echo "Maven build failed."
    exit 1
fi

# 2. Prepare Output Directory
echo ""
echo "[2/4] Preparing distribution directory..."
rm -rf dist
mkdir -p dist
cp "target/${MAIN_JAR}" dist/

# 3. Create ICNS icon if it doesn't exist
echo ""
echo "[3/4] Preparing icon..."
ICNS_PATH="src/main/resources/favicon_io/airbamin.icns"
PNG_PATH="src/main/resources/favicon_io/android-chrome-512x512.png"

if [ ! -f "$ICNS_PATH" ]; then
    echo "Creating ICNS icon from PNG..."
    
    # Create iconset directory
    ICONSET_DIR="airbamin.iconset"
    mkdir -p "$ICONSET_DIR"
    
    # Generate required icon sizes
    sips -z 16 16     "$PNG_PATH" --out "${ICONSET_DIR}/icon_16x16.png" 2>/dev/null
    sips -z 32 32     "$PNG_PATH" --out "${ICONSET_DIR}/icon_16x16@2x.png" 2>/dev/null
    sips -z 32 32     "$PNG_PATH" --out "${ICONSET_DIR}/icon_32x32.png" 2>/dev/null
    sips -z 64 64     "$PNG_PATH" --out "${ICONSET_DIR}/icon_32x32@2x.png" 2>/dev/null
    sips -z 128 128   "$PNG_PATH" --out "${ICONSET_DIR}/icon_128x128.png" 2>/dev/null
    sips -z 256 256   "$PNG_PATH" --out "${ICONSET_DIR}/icon_128x128@2x.png" 2>/dev/null
    sips -z 256 256   "$PNG_PATH" --out "${ICONSET_DIR}/icon_256x256.png" 2>/dev/null
    sips -z 512 512   "$PNG_PATH" --out "${ICONSET_DIR}/icon_256x256@2x.png" 2>/dev/null
    sips -z 512 512   "$PNG_PATH" --out "${ICONSET_DIR}/icon_512x512.png" 2>/dev/null
    cp "$PNG_PATH" "${ICONSET_DIR}/icon_512x512@2x.png"
    
    # Convert to ICNS
    iconutil -c icns "$ICONSET_DIR" -o "$ICNS_PATH"
    
    # Cleanup
    rm -rf "$ICONSET_DIR"
    
    echo "ICNS icon created: $ICNS_PATH"
else
    echo "Using existing ICNS icon: $ICNS_PATH"
fi

# 4. Run jpackage
echo ""
echo "[4/4] Generating macOS DMG Installer..."
echo ""

# Clean output directory
rm -rf output
mkdir -p output

"$JAVA_HOME/bin/jpackage" \
  --type dmg \
  --dest output \
  --name "$APP_NAME" \
  --app-version "$APP_VERSION" \
  --vendor "$VENDOR" \
  --input dist \
  --main-jar "$MAIN_JAR" \
  --main-class "$MAIN_CLASS" \
  --icon "$ICNS_PATH" \
  --mac-package-identifier "$MAC_PACKAGE_ID" \
  --mac-package-name "$APP_NAME" \
  --java-options "-Xdock:name=$APP_NAME" \
  --java-options "-Dapple.awt.application.name=$APP_NAME"

if [ $? -ne 0 ]; then
    echo "jpackage failed."
    exit 1
fi

# 5. Add Applications shortcut to DMG for drag-to-install
echo ""
echo "[5/5] Creating drag-to-install DMG with Applications shortcut..."

OUTPUT_DMG="output/${APP_NAME}-${APP_VERSION}.dmg"
FINAL_DMG="output/${APP_NAME}-${APP_VERSION}-${ARCH_NAME}.dmg"
TEMP_DIR=$(mktemp -d)
MOUNT_POINT="$TEMP_DIR/mount"

# Mount the original DMG
mkdir -p "$MOUNT_POINT"
hdiutil attach "$OUTPUT_DMG" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

# Create a new folder with app and Applications symlink
STAGING_DIR="$TEMP_DIR/staging"
mkdir -p "$STAGING_DIR"
cp -R "$MOUNT_POINT/${APP_NAME}.app" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

# Unmount original DMG
hdiutil detach "$MOUNT_POINT" -quiet

# Remove original DMG
rm -f "$OUTPUT_DMG"

# Create new DMG with proper layout
hdiutil create -volname "$APP_NAME" \
  -srcfolder "$STAGING_DIR" \
  -ov -format UDZO \
  "$FINAL_DMG"

# Cleanup
rm -rf "$TEMP_DIR"

# Remove quarantine attribute
xattr -cr "$FINAL_DMG" 2>/dev/null

echo ""
echo "========================================================"
echo "  Build Complete!"
echo "  Installer: $FINAL_DMG"
echo "========================================================"
echo ""
echo "To install: Double-click the DMG and drag Airbamin to Applications"
echo ""
