# Quick Fix for "MediaProjection requires foreground service" Error

## The Problem
Android 14+ requires a foreground service for MediaProjection API.

## The Fix (Just Created)

I've updated the code with a foreground service. Now you need to:

### Step 1: Add Service to AndroidManifest.xml

Open: `android/app/src/main/AndroidManifest.xml`

Add this **inside the `<application>` tag**, before the closing `</application>`:

```xml
<service
    android:name="com.airbamin.ScreenCaptureService"
    android:foregroundServiceType="mediaProjection"
    android:exported="false" />
```

### Step 2: Rebuild APK

```powershell
cd D:\LIFE\PROGRAMING\airbamin-desktop\airbamin-mobile\android
.\gradlew.bat assembleDebug
```

### Step 3: Reinstall on Phone

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s RF8M41SFHKA install -r app\build\outputs\apk\debug\app-debug.apk
```

### Step 4: Test

- Open app on phone
- Tap Screen Mirroring
- Start Mirroring
- Should work now! 🎉

---

## What I Fixed

1. ✅ Created `ScreenCaptureService.java` (foreground service)
2. ✅ Updated `ScreenCaptureModule.java` to start service before MediaProjection
3. ⏳ **YOU NEED TO**: Add service to AndroidManifest.xml
4. ⏳ Then rebuild & test!
