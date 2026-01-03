#!/bin/bash

# =========================================================
# AirBamin - Linux Build Script
# Creates both DEB (Debian/Ubuntu) and RPM (Fedora/RHEL) packages
# =========================================================

set -e

# Configuration
APP_NAME="Airbamin"
PACKAGE_NAME="airbamin"
# Extract version from pom.xml dynamically
APP_VERSION=$(grep -m1 '<version>' pom.xml | sed 's/.*<version>\(.*\)<\/version>.*/\1/')
VENDOR="Tecbamin"
MAIN_JAR="airbamin-desktop-${APP_VERSION}.jar"
MAIN_CLASS="com.airbamin.desktop.Launcher"
ICON_PATH="src/main/resources/favicon_io/android-chrome-512x512.png"

# Check JAVA_HOME
if [ -z "$JAVA_HOME" ]; then
    echo "Error: JAVA_HOME is not set."
    echo "Please install JDK 17+ and set JAVA_HOME."
    exit 1
fi

echo ""
echo "========================================================"
echo "  Building ${APP_NAME} ${APP_VERSION} for Linux"
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

# 3. Clean output directory
echo ""
echo "[3/4] Preparing output directory..."
rm -rf output
mkdir -p output

# 4. Run jpackage for DEB and RPM
echo ""
echo "[4/4] Generating Linux Packages..."
echo ""

# Check if dpkg is available (Debian-based)
if command -v dpkg &> /dev/null; then
    echo "Creating DEB package..."
    
    "$JAVA_HOME/bin/jpackage" \
      --type deb \
      --dest output \
      --name "$PACKAGE_NAME" \
      --app-version "$APP_VERSION" \
      --vendor "$VENDOR" \
      --input dist \
      --main-jar "$MAIN_JAR" \
      --main-class "$MAIN_CLASS" \
      --icon "$ICON_PATH" \
      --linux-shortcut \
      --linux-menu-group "Utility" \
      --linux-app-category "Utility" \
      --linux-deb-maintainer "support@tecbamin.com" \
      --linux-package-name "$PACKAGE_NAME"
    
    if [ $? -eq 0 ]; then
        echo "DEB package created successfully!"
    else
        echo "DEB creation failed."
    fi
else
    echo "dpkg not found, skipping DEB package."
fi

echo ""

# Check if rpm is available (Red Hat-based)
if command -v rpm &> /dev/null || command -v rpmbuild &> /dev/null; then
    echo "Creating RPM package..."
    
    "$JAVA_HOME/bin/jpackage" \
      --type rpm \
      --dest output \
      --name "$PACKAGE_NAME" \
      --app-version "$APP_VERSION" \
      --vendor "$VENDOR" \
      --input dist \
      --main-jar "$MAIN_JAR" \
      --main-class "$MAIN_CLASS" \
      --icon "$ICON_PATH" \
      --linux-shortcut \
      --linux-menu-group "Utility" \
      --linux-app-category "Utility" \
      --linux-rpm-license-type "Proprietary" \
      --linux-package-name "$PACKAGE_NAME"
    
    if [ $? -eq 0 ]; then
        echo "RPM package created successfully!"
    else
        echo "RPM creation failed."
    fi
else
    echo "rpm/rpmbuild not found, skipping RPM package."
fi

echo ""
echo "========================================================"
echo "  Build Complete!"
echo "  Packages are in the 'output' directory"
echo "========================================================"
echo ""
echo "Install DEB: sudo dpkg -i output/${PACKAGE_NAME}_${APP_VERSION}-1_amd64.deb"
echo "Install RPM: sudo rpm -i output/${PACKAGE_NAME}-${APP_VERSION}-1.x86_64.rpm"
echo ""
