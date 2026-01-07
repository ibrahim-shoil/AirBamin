# Android Icon & Styling Fix Guide

This guide explains the fixes applied to resolve icon display and styling differences between iOS and Android.

## Issues Fixed

### 1. Icon Fonts Not Displaying
**Problem:** Vector icons from `@expo/vector-icons` were not showing on Android.

**Root Cause:**
- Android requires fonts to be explicitly loaded and available in the assets folder
- The font loading path in App.tsx was pointing to node_modules which doesn't work reliably on Android

**Solution:**
- Updated `App.tsx` to load fonts from local assets folder
- Created `react-native.config.js` to ensure Android links fonts properly
- Created `metro.config.js` for proper font asset resolution
- Created `expo-font-plugin.js` to automatically copy fonts to Android assets during build
- Added the font plugin to `app.json`

### 2. Styling Differences
**Problem:** Glass morphism effects and shadows looked different or broken on Android.

**Root Cause:**
- `BlurView` has limited support on Android compared to iOS
- Shadow rendering is different (Android uses `elevation` instead of `shadow*` properties)

**Solution:**
- Updated `GlassView.tsx` to use platform-specific backgrounds
- Android uses more opaque gradients since blur effects are limited
- iOS continues to use BlurView for proper glass morphism
- Ensured `elevation` property is set for Android shadows

## Files Modified

1. **App.tsx**
   - Changed font loading to use local assets
   - Added proper loading state handling

2. **app.json**
   - Added `softwareKeyboardLayoutMode` for better Android keyboard handling
   - Added `expo-font-plugin.js` to plugins array

3. **GlassView.tsx**
   - Added platform-specific styling
   - Conditional BlurView rendering (iOS only)
   - More opaque backgrounds for Android

## Files Created

1. **react-native.config.js**
   - Configures React Native to link assets from `./assets/fonts/`

2. **metro.config.js**
   - Ensures proper font file resolution
   - Adds font extensions to asset resolver

3. **expo-font-plugin.js**
   - Expo config plugin to copy fonts to Android assets automatically
   - Runs during prebuild/build process

## How to Apply the Fixes

### Step 1: Clean the Project
```bash
cd airbamin-mobile

# Clear Metro bundler cache
npx expo start -c

# Or if using npm/yarn
npm start -- --clear
```

### Step 2: Rebuild the Android Project
```bash
# For development build
npx expo prebuild --clean

# Then run on Android
npx expo run:android
```

### Step 3: For Production Build (EAS)
```bash
# Build with EAS
eas build --platform android --profile production

# Or for preview
eas build --platform android --profile preview
```

## Verification

After rebuilding, verify that:

1. ✅ All Feather and Ionicons display correctly
2. ✅ Glass morphism cards show with proper backgrounds
3. ✅ Shadows and elevations render correctly
4. ✅ Font weights (Regular, Bold) display properly
5. ✅ Settings icons, mode selection icons, and all other icons are visible

## Troubleshooting

### Icons Still Not Showing
1. Check if fonts are in `assets/fonts/` directory:
   - Baloo-Regular.ttf
   - Baloo-Bold.ttf
   - Feather.ttf
   - Ionicons.ttf

2. Clear cache and rebuild:
   ```bash
   rm -rf node_modules
   npm install
   npx expo prebuild --clean
   ```

### Styling Still Different
1. Check that `Platform.OS` checks are working correctly
2. Verify Android API level (should be 21+)
3. Check device supports the features (some very old devices may have issues)

## Technical Details

### Font Loading Process
1. Fonts are stored in `assets/fonts/`
2. `expo-font` loads them at app startup
3. `react-native.config.js` ensures they're linked to Android
4. `expo-font-plugin.js` copies them to Android assets during build
5. Android can then access them from the assets folder

### Platform-Specific Rendering
- **iOS**: Uses BlurView + semi-transparent gradients for glass effect
- **Android**: Uses opaque gradients without BlurView for consistent appearance
- Both platforms get proper shadows (iOS: shadow*, Android: elevation)

## Notes
- Changes are backward compatible with iOS
- No breaking changes to the API or user experience
- Android styling now more closely matches iOS appearance
- Performance should be similar or better on Android
