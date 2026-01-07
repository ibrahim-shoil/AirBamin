# Building iOS App - Step by Step Guide

## ✅ What I've Prepared For You

I've created:
- ✅ `eas.json` - Build configuration
- ✅ All Swift native modules
- ✅ TypeScript service bridges
- ✅ Complete UI implementation

## 🔐 What You Need To Do (Auth Required)

These steps require YOUR accounts and cannot be automated:

### Step 1: Install EAS CLI (If not installed)
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
cd d:\LIFE\PROGRAMING\airbamin-desktop\airbamin-mobile
eas login
```

**Enter your Expo credentials** (create account at expo.dev if you don't have one)

### Step 3: Configure Build
```bash
eas build:configure
```

Press Enter to accept defaults (eas.json already exists)

### Step 4: Start the Build
```bash
eas build --platform ios --profile preview
```

**What happens:**
1. EAS will ask for your **Apple ID** (your iCloud email)
2. Enter your **Apple Password**
3. May ask for 2FA code
4. EAS generates signing certificates automatically
5. Build starts in cloud
6. Wait 10-30 minutes
7. Download link appears

### Step 5: Install on iPhone

**Option A: Direct Install (Easiest)**
1. Open the build URL on your iPhone
2. Tap "Install"
3. Allow installation from enterprise

**Option B: Via TestFlight (Needs Apple Developer Account - $99/year)**
```bash
eas submit --platform ios
```

---

## ⚠️ Expected Issues & Solutions

### Issue 1: "Native modules not found"
**Solution:** Run prebuild first:
```bash
npx expo prebuild --platform ios
```

Then manually add Swift files to `ios/` folder and rebuild.

### Issue 2: "Apple Developer membership required"
**Solution:** You need a paid Apple Developer account ($99/year) OR use ad-hoc distribution (limited to 100 devices).

### Issue 3: "Build failed with CocoaPods"
**Solution:** The Swift module needs CocoaAsyncSocket. May need custom config plugin.

---

## 📞 If You Get Stuck

Share the error message with me and I'll help fix the configuration!

## 🎯 Quick Commands Cheat Sheet

```bash
# Check if logged in
eas whoami

# Start build
eas build --platform ios --profile preview

# Check build status
eas build:list

# View build logs
eas build:view

# Cancel build
eas build:cancel
```
