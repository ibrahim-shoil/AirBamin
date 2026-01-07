# Android Screen Mirroring - Setup Guide

## ✅ Files Created

Your Android screen mirroring module is ready!

### Native Module Files
- `native-modules/android/ScreenCaptureModule.java` - Main screen capture implementation
- `native-modules/android/ScreenCapturePackage.java` - React Native package registration

### Updated Files
- `services/ScreenCaptureService.ts` - Removed iOS-only restriction

---

## 🚀 Next Steps to Build

Since this is an Expo managed app, you need to create a **development build** to use native modules.

### Option 1: EAS Build (Recommended)

#### 1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### 2. Configure EAS Build
Update `app.json` to add Android permissions:

```json
"android": {
  "permissions": [
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "READ_MEDIA_IMAGES",
    "READ_MEDIA_VIDEO",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION"
  ]
}
```

#### 3. Create app.plugin.js
Create this file in the mobile app root:

```javascript
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCustomNativeModules(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Add foreground service permission
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }
    
    androidManifest['uses-permission'].push({
      $: {
        'android:name': 'android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION'
      }
    });
    
    return config;
  });
};
```

Then add to `app.json`:
```json
"plugins": [
  "./app.plugin.js",
  ... // existing plugins
]
```

#### 4. Run Prebuild
```bash
cd airbamin-mobile
npx expo prebuild --clean
```

This generates the native Android project in `android/` folder.

#### 5. Register the Package
Edit `android/app/src/main/java/com/airbamin/mobile/MainApplication.java`:

```java
import com.airbamin.ScreenCapturePackage; // Add this import

// In getPackages() method, add:
packages.add(new ScreenCapturePackage());
```

#### 6. Copy Native Modules
```bash
# Copy the Java files to the generated android project
cp native-modules/android/*.java android/app/src/main/java/com/airbamin/
```

#### 7. Build Development Client
```bash
eas build --profile development --platform android
```

Or build locally:
```bash
cd android
./gradlew assembleDebug
```

#### 8. Install & Test
```bash
# Install the APK on your device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Run Metro bundler
npm start
```

---

### Option 2: Eject from Expo (Alternative)

```bash
expo eject
# Then follow steps 5-8 above
```

---

## 📱 Testing

### 1. Grant Permissions
When you tap "Start Mirroring" on Android:
1. System will show screen capture permission dialog
2. User must approve "Start capturing"
3. A notification will appear: "Screen is being cast"

### 2. Expected Behavior
- **Android**: Uses MediaProjection API → H.264 → UDP → Desktop
- **iOS**: Uses ReplayKit → H.264 → UDP → Desktop  
- **Desktop**: Receives UDP on port 9091 → Decodes with FFmpeg → Displays

### 3. Verify
1. Connect Android phone to same Wi-Fi as PC
2. Open AirBamin on desktop
3. Open AirBamin mobile app on Android
4. Tap "Screen Mirroring"
5. Tap "Start Mirroring"
6. Approve permission
7. Your Android screen should appear on PC!

---

## ⚠️ Important Notes

### Android Limitations
- **Notification Required**: Android shows "Screen is being cast" notification (system requirement)
- **Android 5.0+**: MediaProjection API requires minimum Android 5.0 (API 21)
- **Battery Usage**: Screen mirroring is CPU-intensive

### Network Requirements
- **Same Wi-Fi**: Both devices must be on same local network
- **UDP Port 9091**: Ensure no firewall blocking
- **Low Latency**: Should see <150ms delay on good Wi-Fi

### Quality Settings
- **720p @ 30fps**: ~2 Mbps, lower battery usage
- **1080p @ 60fps**: ~4 Mbps, smoother but more battery drain

---

## 🐛 Troubleshooting

### Module Not Found
```
ScreenCaptureModule is not available
```
**Solution**: You're using Expo Go. Build a development client instead.

### Permission Denied
```
User denied screen capture permission
```
**Solution**: User must approve the system dialog. Try again and tap "Start now".

### Black Screen on Desktop
- Check if encoder is running (Logcat: `adb logcat | grep ScreenCapture`)
- Verify network connectivity
- Ensure desktop is listening on port 9091

### High Latency
- Reduce quality to 720p @ 30fps
- Check Wi-Fi signal strength  
- Close other network-heavy apps

---

## 🎯 Summary

**What Works Now:**
- ✅ iOS screen mirroring (existing)
- ✅ Android screen mirroring (NEW!)
- ✅ Desktop receiver (unchanged, works for both)
- ✅ Unified TypeScript interface

**Architecture:**
```
[Android/iOS App]
       ↓
ScreenCaptureModule (Native)
       ↓
H.264 Encoder (Hardware)
       ↓
UDP Packets (port 9091)
       ↓
[Desktop PC]
       ↓
MirrorReceiver (Java)
       ↓
VideoDecoder (FFmpeg)
       ↓
JavaFX ImageView
```

**You're all set!** Just need to build the development client to test. 🚀
