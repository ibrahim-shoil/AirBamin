# Prompt for AI Codex (Backend Implementation)

**Context:**
We are building a mobile app for "AirBamin" and unifying the authentication system with the Desktop app. We need to implement a native "Sign Up" API and temporarily make the service **free for all users** (Mobile & PC).

**Tasks:**

### 1. Implement Mobile Registration Endpoint
Create a new API endpoint for mobile user registration.

*   **Endpoint**: `POST /api/mobile/register`
*   **Request Body**:
    ```json
    {
      "name": "User Name",
      "email": "user@example.com",
      "password": "securePassword123",
      "device_id": "unique_device_id",
      "platform": "android" // or "ios"
    }
    ```
*   **Logic**:
    *   Validate email uniqueness and password strength.
    *   Create the user in the database.
    *   **Auto-Login**: Immediately return the session token and user info (same format as Login) so the user doesn't have to log in again.

### 2. Implement "Free for Now" Logic
We want to dispense with payments for the current phase.

*   **Requirement**: Ensure that **ALL** users (new registrations via mobile and existing desktop logins) are returned with a valid plan status that allows full access.
*   **Implementation**:
    *   When returning the `plan` field in the Login/Register response, ensure it is set to a value that represents a valid, active subscription (e.g., `"free"` or `"standard"`), but **without** any feature restrictions on the server side.
    *   If your system checks for expiration dates, please set the `expires_at` date to far in the future (e.g., `2099-12-31`) or disable the expiration check for now.

### 3. Response Format (for both Login & Register)
Ensure the response JSON matches this structure so the Mobile and Desktop apps can parse it correctly:

```json
{
  "ok": true,
  "token": "jwt_token_here",
  "plan": "free",  // Or "pro", as long as it allows access
  "expires_at": "2099-12-31T23:59:59Z",
  "features": ["all_features_enabled"], // Optional: list enabled features
  "user": {
      "id": 123,
      "name": "User Name",
      "email": "user@example.com"
  }
}
```

**Summary of Changes Needed on Backend:**
1.  Add `POST /api/mobile/register`.
2.  Update Login/Register logic to grant free access (valid plan/no expiration) to all users for now.
