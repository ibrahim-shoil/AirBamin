# Airbamin Mobile App

Wireless file transfer from your phone to your PC - the mobile companion app for [Airbamin Desktop](../airbamin-desktop/).

## 📱 Features

- ✅ **Wireless Transfer**: Upload files from your phone to PC over WiFi
- ✅ **QR Code Connection**: Scan QR code from desktop app for instant connection
- ✅ **Multi-file Upload**: Select and upload multiple files at once
- ✅ **Beautiful UI**: Modern dark theme with glassmorphic design
- ✅ **Cross-platform**: Works on iOS and Android
- ✅ **No Account Required**: Direct local network transfer

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- iOS device with Expo Go app (for iPhone testing)
- OR Android device with Expo Go app (for Android testing)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Testing on Your Phone

1. **Download Expo Go** on your phone:
   - iOS: App Store
   - Android: Google Play Store

2. **Start the dev server**:
   ```bash
   npm start
   ```

3. **Connect**:
   - Scan the QR code with Expo Go
   - App loads instantly on your phone!

## 📂 Project Structure

```
airbamin-mobile/
├── App.tsx              # Main app with home screen
├── app.json             # Expo configuration
├── package.json         # Dependencies
├── assets/              # Images, icons, fonts
└── components/          # (Coming soon) Reusable components
```

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start Expo dev server
npm run android    # Open on Android emulator
npm run ios        # Open on iOS simulator (Mac only)
npm run web        # Open in web browser
```

### Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **State Management**: React Hooks
- **File Handling**: expo-document-picker, expo-image-picker
- **Network**: Axios
- **UI Components**: React Native Paper

## 📱 Testing on iPhone 16 Pro Max

See the [Implementation Plan](../implementation_plan.md) for detailed testing instructions.

**Quick version:**
1. Ensure iPhone and PC are on same WiFi
2. Run `npm start`
3. Open Expo Go on iPhone
4. Scan QR code
5. App runs on your iPhone!

## 🎨 Design

The mobile app matches the desktop app's aesthetic:
- **Colors**: Dark theme (`#0e0f12`) with accent colors
- **Glassmorphism**: Frosted glass effect cards
- **Shadows**: Glowing shadows for depth
- **Typography**: Bold, modern fonts

## 🔧 Configuration

### App Name
Configured in `app.json`:
```json
{
  "expo": {
    "name": "Airbamin",
    "slug": "airbamin-mobile"
  }
}
```

### Bundle Identifiers
- iOS: `com.airbamin.mobile`
- Android: `com.airbamin.mobile`

## 📦 Building for Production

### Cloud Build (No Mac needed!)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### App Store Submission

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

## 🌍 Localization

Currently supports:
- 🇺🇸 English
- 🇸🇦 Arabic (coming soon)

## 📝 License

MIT License - See repository root for details

## 🤝 Contributing

This is part of the Airbamin project. See main repository for contribution guidelines.

## 📞 Support

For issues or questions, please open an issue in the main Airbamin repository.

---

**Made with ❤️ for seamless file transfer**
