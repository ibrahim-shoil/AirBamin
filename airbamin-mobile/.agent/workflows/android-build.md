---
description: How to build and run the Android mobile app.
---

# Building Android App

// turbo-all

1. Set Java 17 environment:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

2. Navigate to mobile project:
```powershell
cd d:\LIFE\PROGRAMING\airbamin-desktop\airbamin-mobile
```

3. Run Android build:
```powershell
npx expo run:android
```

## Notes
- **Java 17 is required** - Java 25 is not compatible with React Native
- Make sure your Android device is connected via USB with USB debugging enabled
- If build fails with plugin errors, try `cd android; .\gradlew.bat clean`