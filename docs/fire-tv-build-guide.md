# Fire TV APK Build Guide

This guide explains how to build an APK that can be installed directly on Fire TV devices.

## Prerequisites

You need one of the following:

### Option 1: Local Build (Requires Java)
- Java JDK 17 (Zulu recommended) - [Download Zulu 17](https://www.azul.com/downloads/?package=jdk#zulu)
- Android SDK (via Android Studio)
- Set `JAVA_HOME` environment variable

### Option 2: EAS Cloud Build (Recommended)
- Expo account
- EAS CLI installed (`npm install -g eas-cli`)
- Logged in to EAS (`eas login`)

## Build Methods

### Method 1: EAS Cloud Build (Easiest)

1. **Login to EAS** (if not already logged in):
   ```bash
   npx eas-cli login
   ```

2. **Build APK for Amazon Appstore**:
   ```bash
   npx eas-cli build --profile amazon-appstore --platform android
   ```

3. **Download APK**:
   - After build completes, download the APK from the EAS dashboard
   - Or use the download URL provided in the build output

### Method 2: Local Build with Gradle

1. **Install Java JDK 17** (if not installed):
   ```bash
   # Using Homebrew (macOS)
   brew install --cask zulu@17
   
   # Set JAVA_HOME in your shell profile (~/.zshrc or ~/.bashrc)
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home
   ```

2. **Run Prebuild** (if you haven't already):
   ```bash
   yarn prebuild --platform android
   ```

3. **Build Release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **Find the APK**:
   - Location: `android/app/build/outputs/apk/release/app-release.apk`

### Method 3: EAS Local Build (Requires Docker)

1. **Install Docker Desktop** (if not installed)

2. **Build locally with EAS**:
   ```bash
   npx eas-cli build --profile amazon-appstore --platform android --local
   ```

## Installing APK on Fire TV

Once you have the APK, install it on your Fire TV device:

### Method 1: Using ADB (Recommended)

1. **Enable Developer Options on Fire TV**:
   - Go to Settings → My Fire TV → About
   - Click on "Fire TV Stick" (or your device name) 7 times
   - Go back and select "Developer Options"
   - Enable "ADB" and "Apps from Unknown Sources"

2. **Connect via ADB**:
   ```bash
   # Find your Fire TV's IP address (Settings → Network)
   adb connect <FIRE_TV_IP_ADDRESS>
   
   # Install APK
   adb install app-release.apk
   ```

### Method 2: Using Downloader App

1. **Install Downloader app** on Fire TV from Amazon Appstore

2. **Upload APK to cloud storage** (Google Drive, Dropbox, etc.)

3. **Download APK** using Downloader app:
   - Open Downloader
   - Enter the download URL
   - Download and install

### Method 3: Using USB Drive

1. **Copy APK to USB drive**

2. **Connect USB to Fire TV** (if supported)

3. **Install using File Manager** app on Fire TV

## Verification

After installation, verify the app:

1. **Check TV Launcher**: App should appear in Fire TV's app launcher
2. **Launch App**: Open the app and verify it runs correctly
3. **Test Navigation**: Use Fire TV remote to navigate
4. **Test Subscriptions**: Follow the testing guide in `docs/tv-testing-guide.md`

## Troubleshooting

### Build Errors

**"Unable to locate a Java Runtime"**
- Install Java JDK 17 and set JAVA_HOME
- See Method 2 above for installation steps

**"EAS not logged in"**
- Run `npx eas-cli login` to authenticate

**"Gradle build failed"**
- Ensure Android SDK is properly configured
- Check `android/local.properties` has correct SDK path
- Try `cd android && ./gradlew clean` then rebuild

### Installation Errors

**"App not installed"**
- Ensure "Apps from Unknown Sources" is enabled
- Check APK is for correct architecture (arm64-v8a for Fire TV)
- Verify APK signature is valid

**"App doesn't appear in launcher"**
- Check AndroidManifest.xml has LEANBACK_LAUNCHER category (already configured)
- Verify app installed successfully: `adb shell pm list packages | grep bluefly`

## Next Steps

After building and installing:

1. **Test Subscription Flow**: Follow `docs/tv-testing-guide.md` for production testing
2. **Submit to Amazon Appstore**: Once tested, submit for review
3. **Enable TV Targeting**: In Amazon Developer Console, enable Fire TV as target device

