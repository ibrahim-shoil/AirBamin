#!/bin/bash

# AirBamin Desktop - Linux Build Script

# Ensure JAVA_HOME is set
if [ -z "$JAVA_HOME" ]; then
  echo "Error: JAVA_HOME is not set. Please install JDK 21 and set JAVA_HOME."
  exit 1
fi

# 1. Clean and Package
echo "Building project with Maven..."
mvn clean package

if [ $? -ne 0 ]; then
  echo "Maven build failed."
  exit 1
fi

# 2. Prepare Output Directory
echo "Preparing distribution directory..."
rm -rf dist
mkdir -p dist
cp target/airbamin-desktop-1.0-SNAPSHOT.jar dist/

# 3. Run jpackage
echo "Creating Debian package..."
"$JAVA_HOME/bin/jpackage" \
  --type deb \
  --name "airbamin-desktop" \
  --app-version 1.2.0 \
  --vendor "Tecbamin" \
  --input dist \
  --main-jar airbamin-desktop-1.0-SNAPSHOT.jar \
  --main-class com.airbamin.desktop.Launcher \
  --icon src/main/resources/favicon_io/android-chrome-512x512.png \
  --linux-shortcut \
  --linux-menu-group "Utility"

if [ $? -eq 0 ]; then
  echo "Build complete! You can install the package using: sudo dpkg -i airbamin-desktop_1.2.0-1_amd64.deb"
else
  echo "jpackage failed."
  exit 1
fi
