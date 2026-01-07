# Quick Setup - Android Screen Mirroring

## Step 1: Edit MainApplication.kt

You have this file open: `android/app/src/main/java/com/airbamin/mobile/MainApplication.kt`

### Add import at the top (around line 5):
```kotlin
import com.airbamin.ScreenCapturePackage
```

### In the getPackages() method, add this line:
```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        // Add more packages here
        add(ScreenCapturePackage())  // <-- ADD THIS LINE
    }
```

Save the file!

## Step 2: Build

```bash
cd android
.\gradlew.bat assembleDebug
```

## Step 3: Install

The APK will be at:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

Install it:
```bash
adb install app\build\outputs\apk\debug\app-debug.apk
```

## Step 4: Test

1. Make sure desktop app is running
2. Open mobile app
3. Tap "Screen Mirroring"
4. Tap "Start Mirroring"
5. Approve system permission
6. Your screen should appear on PC!

Done! 🎉
