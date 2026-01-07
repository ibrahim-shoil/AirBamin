# iOS Build Instructions

## 🚀 Successful Build Command
Run this exact command in **PowerShell** to build the iOS app:

```powershell
$env:EAS_NO_VCS=1; eas build --platform ios --profile development --clear-cache
```

### Breakdown:
- `$env:EAS_NO_VCS=1`: Bypasses Git dirty check (useful if you have uncommitted changes).
- `--platform ios`: Targets iOS.
- `--profile development`: Uses the development build profile (for testing on device).
- `--clear-cache`: **Crucial.** Ensures a clean build, preventing old cache from causing issues.

## 📦 Standalone Preview Build (No Server Needed)
If you want an app that runs **without** your PC (like a real App Store app), run this command:

```powershell
$env:EAS_NO_VCS=1; eas build --platform ios --profile preview --clear-cache
```

This will create an "Internal Distribution" build. You can install it, and it will work anywhere, even without your computer.

---

## ⚠️ Critical Configurations (DO NOT REMOVE)

The following settings were essential to fixing the build failures. **Do not modify these unless you know exactly what you are doing.**

### 1. Static Frameworks (`app.json`)
We enabled static frameworks to support Firebase native modules:
```json
"ios": {
  "useFrameworks": "static"
}
```

### 2. Podfile Fix (`app.plugin.js`)
We added a custom plugin script to inject a fix into the generated `Podfile`. This resolves the "non-modular include" errors caused by static frameworks.
**Code in `app.plugin.js`:**
```javascript
config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
```

### 3. Removed Dependencies
The following packages were **removed** because they caused conflicts with the iOS deployment target:
- `react-native-zip-archive`
- `react-native-webrtc`

---

## 📱 Installation
Once the build finishes, you can install it on your registered devices using the link or QR code provided in the terminal output.

## 🏃‍♂️ Running the App (Development Build)

Since we built a **Development Build**, the app needs a server running on your PC to provide the JavaScript bundle.

1.  **Start the Server:**
    Run this command in your terminal (forces LAN IP for physical devices):
    ```powershell
    $env:REACT_NATIVE_PACKAGER_HOSTNAME='192.168.1.11'; npx expo start --dev-client
    ```

2.  **Connect:**
    -   Ensure your iPhone and PC are on the **same Wi-Fi network**.
    -   Open the **Camera** app on your iPhone.
    -   Scan the QR code displayed in the terminal.
    -   Tap the notification to open **Airbamin**.

**Note:** If scanning doesn't work, you can manually enter the URL (e.g., `exp://192.168.1.x:8081`) in the app's development menu (shake device or long-press three fingers).
