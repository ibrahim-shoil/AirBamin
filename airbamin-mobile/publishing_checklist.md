# AirBamin Publishing Checklist

This document outlines the steps and requirements to ensure your app is ready for publishing on Google Play and the Apple App Store, specifically focusing on privacy and compliance.

## 1. Codebase & Configuration (Completed)
- [x] **Remove Unused Permissions**: Removed `FOREGROUND_SERVICE_MEDIA_PROJECTION` and `RECORD_AUDIO` from `app.json`.
    - *Reason*: Since you hid the screen mirroring feature, keeping these sensitive permissions would trigger a rejection or require a complex "Data Safety" declaration that you cannot justify without the feature being active.
- [ ] **Verify In-App Privacy Text**:
    - *Observation*: Your `i18n.ts` file mentions "Third-party software may be used to serve ads" and "analytics".
    - *Action*: If you are **not** running ads or analytics (as stated in your web policy), you should update the in-app text to match. Conflicting statements can lead to rejection.

## 2. Privacy Policy (Web)
Your current privacy policy at `https://tecbamin.com/airbamin/privacy/en` is **excellent** and covers the key areas. Ensure it remains accessible.

- **Key Points Covered**:
    - **Data Collection**: Correctly lists Name, Email, Google ID (via Firebase).
    - **Permissions**: Correctly explains Camera (QR), Local Network (Discovery), and Storage (File Transfer).
    - **Data Retention**: Correctly states files are not stored on servers.
    - **No Ads/Selling Data**: Explicitly stated.

## 3. Google Play Console (Data Safety Section)
When filling out the "Data Safety" form in Google Play Console, answer as follows:

- **Does your app collect or share any of the required user data types?** -> **Yes**
- **Is all of the user data collected by your app encrypted in transit?** -> **Yes** (for Account Data). *Note: File transfers are local HTTP, but "collected" usually refers to data sent to your servers. Since files stay local, you can focus on the Account Data which goes to Firebase via HTTPS.*
- **Do you provide a way for users to request that their data be deleted?** -> **Yes** (You must provide a link or email, e.g., `contact@tecbamin.com`).

### Data Types to Declare:
1.  **Personal Info -> Name / Email Address / User IDs**:
    -   **Collected?** Yes.
    -   **Shared?** No (Firebase is a service provider).
    -   **Purpose**: App Functionality, Account Management.
2.  **Photos and Videos**:
    -   **Collected?** No (if they never leave the user's local network/devices). *However*, if Google asks if you "access" them, say Yes. But usually "Collection" means "off-device transfer". Since it stays local, you can often say "No" to *collection* but you must declare the *permission*.
    -   *Safe Bet*: If you want to be 100% safe, say "Yes" (Collected), Purpose: App Functionality, Ephemeral (not stored).
3.  **App Info and Performance -> Crash logs**:
    -   **Collected?** No (You don't have Crashlytics installed).

## 4. Apple App Store Connect (App Privacy)
Fill out the "App Privacy" section as follows:

- **Data Types**:
    -   **Contact Info**: Name, Email Address.
    -   **Identifiers**: User ID.
- **Usage for all above**: App Functionality.
- **Linked to User**: Yes.
- **Tracking**: No.

## 5. Store Listing Assets
Ensure you have the following ready:
- **App Icon**: 1024x1024 px (No transparency).
- **Screenshots**:
    -   **iPhone**: 6.5" (1284 x 2778 px) and 5.5" (1242 x 2208 px).
    -   **iPad**: 12.9" (2048 x 2732 px).
    -   **Android**: Phone, 7-inch tablet, 10-inch tablet.
- **Feature Graphic (Google Play)**: 1024x500 px.
- **Short Description (Google Play)**: 80 characters.
- **Full Description**: Detailed explanation of features.

## 6. Final Checks
- [ ] **Version Number**: Ensure `version` in `app.json` (currently `1.0.0`) matches what you want to release.
- [ ] **Build Number**: Increment `ios.buildNumber` and `android.versionCode` for every new upload.
- [ ] **Test**: Run a final build (`eas build --platform all`) to ensure the removal of permissions didn't break the build (it shouldn't).
