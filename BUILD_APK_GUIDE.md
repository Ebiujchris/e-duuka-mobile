# E-Duuka Mobile - APK Build Guide

This guide will help you build an APK file for the E-Duuka mobile app.

## Prerequisites

1. **Node.js and npm** - Already installed ✓
2. **Expo account** - You'll need to create one (free)
3. **EAS CLI** - Install globally

## Method 1: EAS Build (Recommended - Easiest)

This method builds your APK in the cloud, so you don't need Android Studio or Java SDK.

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
cd E-DUUKA-MOBILE
eas login
```

If you don't have an Expo account, create one at https://expo.dev/signup

### Step 3: Configure Your Project

```bash
eas build:configure
```

This will:
- Create an Expo project if needed
- Update your app.json with a project ID

### Step 4: Build APK

```bash
eas build --platform android --profile preview
```

Options:
- `preview` - Builds an APK (installable file)
- `production` - Builds an AAB (for Google Play Store)

The build will take 10-20 minutes. You'll get a download link when it's done.

### Step 5: Download and Install

1. Click the download link from the terminal
2. Transfer the APK to your Android phone
3. Enable "Install from Unknown Sources" in phone settings
4. Install the APK

---

## Method 2: Local Build (Advanced - Requires Android Studio)

This method builds the APK locally on your computer.

### Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17** - Required for Android builds
3. **Android SDK** - Installed via Android Studio

### Step 1: Install Expo Prebuild

```bash
cd E-DUUKA-MOBILE
npx expo prebuild --platform android
```

This creates the `android` folder with native code.

### Step 2: Build APK

```bash
cd android
./gradlew assembleRelease
```

On Windows:
```bash
cd android
gradlew.bat assembleRelease
```

### Step 3: Find Your APK

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Important Configuration Notes

### API URL Configuration

Before building, make sure your API URL is correct in the app:

**File:** `E-DUUKA-MOBILE/src/services/ApiService.js`

```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

⚠️ **IMPORTANT:** Change `localhost` to your actual server IP or domain before building!

For testing on local network:
```javascript
const API_BASE_URL = 'http://192.168.1.100:3001/api'; // Your computer's IP
```

For production:
```javascript
const API_BASE_URL = 'https://your-domain.com/api';
```

### App Information

Update these in `app.json`:
- `name` - App display name
- `version` - App version (increment for updates)
- `android.package` - Unique package identifier
- `android.versionCode` - Increment for each build

---

## Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
```

### "Not logged in"
```bash
eas login
```

### Build fails with "Invalid credentials"
```bash
eas credentials
```

### APK won't install on phone
1. Enable "Install from Unknown Sources"
2. Check if you have enough storage
3. Try uninstalling old version first

---

## Quick Start (Recommended)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Navigate to project
cd E-DUUKA-MOBILE

# 3. Login to Expo
eas login

# 4. Configure project
eas build:configure

# 5. Build APK
eas build --platform android --profile preview

# 6. Wait for build to complete (10-20 minutes)
# 7. Download APK from the link provided
# 8. Install on your Android device
```

---

## Next Steps After Building

1. **Test the APK** - Install and test all features
2. **Update API URL** - Make sure it points to your production server
3. **Increment version** - Update version in app.json for each new build
4. **Google Play Store** - Use `production` profile to build AAB for store

---

## Support

- Expo Documentation: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- Android Build: https://docs.expo.dev/build-reference/apk/
