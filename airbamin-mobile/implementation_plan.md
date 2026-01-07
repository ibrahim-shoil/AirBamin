# Implementation Plan - Unified Authentication System

## Goal
Replace the current Firebase Authentication in the mobile app with the custom "Tecbamin" authentication system. This involves removing Firebase dependencies and integrating with the Tecbamin REST API for both Login and Registration.

## User Review Required
> [!IMPORTANT]
> **Backend Dependency**: This plan assumes the creation of a `POST /api/mobile/register` endpoint as described in `backend_prompt.md`.
> **Action**: Please use the provided prompt to have your backend updated. I will proceed with the mobile implementation assuming this API will be available.

## Proposed Changes

### 1. New Services & Context
#### [NEW] [AuthService.ts](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/services/AuthService.ts)
-   **Login**: `POST https://tecbamin.com/api/desktop/login`
-   **Register**: `POST https://tecbamin.com/api/mobile/register` (New Endpoint)
-   **Session**: `GET /api/desktop/subscription` (for token validation)
-   **Storage**: Use `AsyncStorage` to persist the auth token.

#### [NEW] [AuthContext.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/contexts/AuthContext.tsx)
-   Manage `user`, `token`, `isLoading`.
-   Expose `login`, `register`, `logout`.
-   Auto-login on app launch by checking stored token.

### 2. Screen Updates
#### [MODIFY] [LoginScreen.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/screens/LoginScreen.tsx)
-   Remove Firebase/Google imports.
-   Use `useAuth().login(email, password)`.
-   Handle API errors (e.g., "Invalid credentials").

#### [MODIFY] [SignUpScreen.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/screens/SignUpScreen.tsx)
-   Remove Firebase imports.
-   Use `useAuth().register(name, email, password)`.
-   Handle API errors (e.g., "Email already in use").

#### [MODIFY] [App.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/App.tsx)
-   Wrap with `AuthProvider`.
-   Show a loading screen while checking initial session state.

### 3. Cleanup
#### [MODIFY] [package.json](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/package.json)
-   Remove:
    -   `@react-native-firebase/auth`
    -   `@react-native-firebase/app`
    -   `@react-native-google-signin/google-signin`
-   **Note**: If you use Firebase for other things (Analytics, Crashlytics), keep the core `app` package. If it was *only* for Auth, remove it all. (Based on `app.json`, it seems only Auth/App were used explicitly, but I'll check if `google-services.json` is still needed).

### 4. Email Verification Flow
#### [NEW] [VerifyEmailScreen.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/screens/VerifyEmailScreen.tsx)
-   UI: Input for 6-digit code.
-   Logic: Call `verifyEmail(email, code)`.
-   On Success: Auto-login and navigate to Mode Selection.

#### [MODIFY] [AuthService.ts](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/services/AuthService.ts)
-   Update `register` to return `verification_required`.
-   Add `verifyEmail(email, code)`: `POST /api/mobile/verify`.
-   Update `login` to handle `verification_required` error.

#### [MODIFY] [AuthContext.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/contexts/AuthContext.tsx)
-   Add `verifyEmail` function.
-   Update `register` to NOT set user/token immediately if verification is required.

#### [MODIFY] [SignUpScreen.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/screens/SignUpScreen.tsx)
-   If `register` returns `verification_required`, navigate to `VerifyEmailScreen` passing the email.

#### [MODIFY] [LoginScreen.tsx](file:///d:/LIFE/PROGRAMING/airbamin-desktop/airbamin-mobile/screens/LoginScreen.tsx)
-   If `login` returns `verification_required`, navigate to `VerifyEmailScreen`.

## Verification Plan
### Manual Verification
1.  **Register**: Create account -> Verify redirected to Code screen.
2.  **Verify**: Enter code from email -> Verify logged in.
3.  **Login Unverified**: Try logging in with unverified account -> Verify redirected to Code screen.
4.  **Login Verified**: Login with verified account -> Verify success.
