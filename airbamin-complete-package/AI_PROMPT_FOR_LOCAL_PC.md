# AI PROMPT FOR LOCAL PC - AIRBAMIN DESKTOP BUILD & TESTING

## Context

I'm continuing work on **AirBamin**, a commercial desktop file transfer application. The backend API is complete and tested on the production server. Now I need to build and test the Java desktop app on my local PC.

## What Was Already Done (Server-Side)

✅ **Backend API** - Fully working on https://tecbamin.com/api/airbamin
- Update check endpoint
- Gift code generation (admin)
- Gift code activation
- License status validation
- All responses HMAC-signed for security

✅ **Database** - 6 tables deployed with test data
- 5 gift codes generated (4 unused)
- 1 test license activated

✅ **Desktop Code** - 100% complete, ready to build
- All 11 Java service/security/model files created
- Dependencies configured in pom.xml
- API URL configured in application.properties

## What I Need You To Do

### STEP 1: Setup Project on Local PC

First, I'll provide you the project files. Then:

1. **Verify Java Environment**
   ```bash
   java -version    # Should be Java 17 or higher
   mvn -version     # Or use ./mvnw in project
   ```

2. **Project Location**
   The project should be in: `airbamin-server/` directory

3. **Verify File Structure**
   Check these key files exist:
   ```
   airbamin-server/
   ├── pom.xml
   ├── mvnw (Maven wrapper)
   ├── src/main/java/com/airbamin/airbaminserver/
   │   ├── service/
   │   │   ├── DeviceIdService.java
   │   │   ├── UpdateService.java
   │   │   └── LicenseService.java
   │   ├── security/
   │   │   ├── CryptoUtil.java
   │   │   ├── SecurityGuard.java
   │   │   └── IntegrityChecker.java
   │   └── model/
   │       ├── UpdateResponse.java
   │       ├── LicenseResponse.java
   │       ├── GiftActivationRequest.java
   │       └── LicenseCache.java
   └── src/main/resources/
       └── application.properties
   ```

### STEP 2: Build the Application

1. **Clean and Build**
   ```bash
   cd airbamin-server
   ./mvnw clean package -DskipTests
   ```

   **Expected Output**:
   - BUILD SUCCESS
   - JAR file created: `target/airbamin-server-1.0.0.jar`

2. **Fix Any Compilation Errors**
   If there are errors:
   - Read the error messages carefully
   - Check if imports are correct
   - Verify Jackson dependencies in pom.xml
   - Fix syntax/type errors in Java files
   - Re-run build

### STEP 3: Test Backend Integration (Before Running App)

Test the APIs directly from my PC to verify connectivity:

**Test 1: Update Check**
```bash
curl https://tecbamin.com/api/airbamin/update \
  -H "X-App-Version: 0.9.0" \
  -H "X-Device-ID: test-pc-001"
```
Expected: JSON with `"status": "update_required"`

**Test 2: Gift Activation** (use one of the unused codes)
```bash
curl -X POST https://tecbamin.com/api/airbamin/gift/activate \
  -H "Content-Type: application/json" \
  -d '{
    "giftCode": "AIRBAMIN-2025-GCIX",
    "deviceId": "my-windows-pc-001",
    "deviceName": "My Development PC",
    "osVersion": "Windows 11",
    "appVersion": "1.0.0"
  }'
```
Expected: JSON with `"status": "activated"` and a `licenseKey` UUID

**Save the license key returned!** You'll need it for testing.

### STEP 4: Update API Secret in Java Code

⚠️ **CRITICAL**: The Java code needs the correct API secret for HMAC verification.

1. **Open File**: `src/main/java/com/airbamin/airbaminserver/security/CryptoUtil.java`

2. **Find This Line** (around line 14):
   ```java
   private static final String SERVER_PUBLIC_KEY = "CHANGE_THIS_TO_MATCH_BACKEND_SECRET";
   ```

3. **Replace With**:
   ```java
   private static final String SERVER_PUBLIC_KEY = "3e2431ffc587315ed940778a9bed3b674060a5f3f66d882f85ceef6bb6a8249d";
   ```

4. **Rebuild**:
   ```bash
   ./mvnw clean package -DskipTests
   ```

### STEP 5: Run the Desktop Application

```bash
java -jar target/airbamin-server-1.0.0.jar
```

**Expected Behavior**:
1. ✅ App starts on port 9090
2. ✅ Logs show "Started AirbaminServerApplication"
3. ✅ You see the network mode selection UI
4. ✅ QR code is generated for phone connection
5. ✅ Console may show background update check

### STEP 6: Test Update Service Integration

Create a test class or add logging to verify UpdateService works:

**Option A: Add Logging to Main Application**

In your main application class or a test endpoint:

```java
@Autowired
private UpdateService updateService;

@PostConstruct
public void testUpdateCheck() {
    try {
        UpdateService.UpdateStatus status = updateService.checkForUpdate();
        System.out.println("=== UPDATE CHECK TEST ===");
        System.out.println("Status: " + status);
        System.out.println("Current Version: " + updateService.getCurrentVersion());
        System.out.println("========================");
    } catch (Exception e) {
        System.err.println("Update check failed: " + e.getMessage());
        e.printStackTrace();
    }
}
```

**Option B: Create a Test Endpoint**

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @Autowired
    private UpdateService updateService;

    @GetMapping("/update")
    public Map<String, Object> testUpdate() {
        UpdateService.UpdateStatus status = updateService.checkForUpdate();
        Map<String, Object> result = new HashMap<>();
        result.put("status", status);
        result.put("currentVersion", updateService.getCurrentVersion());
        return result;
    }
}
```

Then test: `curl http://localhost:9090/test/update`

**Expected Results**:
- Status should be `UPDATE_AVAILABLE` or `UPDATE_REQUIRED` (current version is 1.0.0 in properties, backend has 1.0.0)
- No SSL/connection errors
- HMAC signature verification passes

### STEP 7: Test License Service Integration

**Test License Activation in Code**:

Create a test endpoint:

```java
@RestController
@RequestMapping("/test")
public class TestController {

    @Autowired
    private LicenseService licenseService;

    @PostMapping("/activate")
    public Map<String, Object> testActivation(@RequestParam String giftCode) {
        try {
            boolean success = licenseService.activateGiftCode(giftCode);
            Map<String, Object> result = new HashMap<>();
            result.put("success", success);
            result.put("licenseStatus", licenseService.getLicenseStatus());
            return result;
        } catch (Exception e) {
            return Map.of("error", e.getMessage());
        }
    }

    @GetMapping("/license-status")
    public Map<String, Object> testLicenseStatus() {
        Map<String, Object> result = new HashMap<>();
        result.put("status", licenseService.getLicenseStatus());
        result.put("isActive", licenseService.isLicenseActive());
        result.put("daysRemaining", licenseService.getDaysRemaining());
        return result;
    }
}
```

**Test Activation**:
```bash
curl -X POST "http://localhost:9090/test/activate?giftCode=AIRBAMIN-2025-3EMB"
```

**Test License Status**:
```bash
curl http://localhost:9090/test/license-status
```

**Expected Results**:
- Activation returns `success: true`
- License status returns `ACTIVE`
- Days remaining shows ~90
- License cached to: `%APPDATA%/AirBamin/license.enc` (Windows)

### STEP 8: Test SecurityGuard Enforcement

**Test File Size Limits**:

Create a test:

```java
@Autowired
private SecurityGuard securityGuard;

@GetMapping("/test/security")
public Map<String, Object> testSecurity() {
    Map<String, Object> result = new HashMap<>();
    result.put("maxFileSize", securityGuard.getMaxFileSize());
    result.put("maxFileSizeMB", securityGuard.getMaxFileSize() / (1024 * 1024));
    result.put("isQRAllowed", securityGuard.isQRAllowed());
    result.put("isBulkTransferAllowed", securityGuard.isBulkTransferAllowed());
    return result;
}
```

**Before Activation**:
```bash
curl http://localhost:9090/test/security
```
Expected: `maxFileSizeMB: 10` (free tier)

**After Activation**:
```bash
curl http://localhost:9090/test/security
```
Expected: `maxFileSizeMB: 100` (licensed)

### STEP 9: Test Offline Grace Period

1. **Activate license** (if not already done)
2. **Verify license status** returns ACTIVE
3. **Disconnect from internet** (disable WiFi)
4. **Restart app**
5. **Check license status again**

**Expected Behavior**:
- Within 7 days: App uses cached license, works normally
- 7-14 days: App shows warning but still works
- 14-30 days: Grace period, shows urgent warning
- 30+ days: Hard lock, requires online validation

**Test by manipulating cache file date**:
```java
// In LicenseService, temporarily modify cache validation
// Change: if (cacheAge < 7 days) to if (cacheAge < 5 seconds)
// This simulates expired cache without waiting
```

### STEP 10: Verify Device Fingerprinting

**Test Device ID Generation**:

```java
@Autowired
private DeviceIdService deviceIdService;

@GetMapping("/test/device")
public Map<String, Object> testDevice() {
    Map<String, Object> result = new HashMap<>();
    result.put("deviceId", deviceIdService.getDeviceId());
    result.put("deviceName", deviceIdService.getDeviceName());
    result.put("osVersion", deviceIdService.getOSVersion());
    return result;
}
```

```bash
curl http://localhost:9090/test/device
```

**On Windows**: Should return Windows Machine GUID (stable, unique)
**On Mac/Linux**: Should return MAC address hash (fallback)

**Verify it's stable**:
1. Restart app multiple times
2. Device ID should be identical each time

### STEP 11: Integration Test Checklist

Run through this checklist and report results:

- [ ] App compiles without errors
- [ ] App starts and runs on port 9090
- [ ] Update check connects to backend API
- [ ] HMAC signature verification passes
- [ ] Gift code activation works
- [ ] License key is cached to disk (check %APPDATA%/AirBamin/)
- [ ] Cache file is encrypted (not plaintext JSON)
- [ ] License status returns ACTIVE after activation
- [ ] SecurityGuard returns 100MB limit when licensed
- [ ] SecurityGuard returns 10MB limit when unlicensed
- [ ] Device ID is stable across restarts
- [ ] Offline mode works (uses cache within 7 days)
- [ ] App shows update notification when backend has newer version

### STEP 12: Test Failure Scenarios

**Test Invalid Gift Code**:
```bash
curl -X POST http://localhost:9090/test/activate?giftCode=INVALID-CODE
```
Expected: Error message, not crash

**Test Used Gift Code** (try activating AIRBAMIN-2025-HFNH again):
Expected: Error "already used" or similar

**Test Expired License** (requires backend change):
- Manually update database to set `expires_at` to past date
- Check license status
- Expected: Status = EXPIRED

**Test Network Failure**:
- Disconnect internet
- Try to activate new gift code
- Expected: Clear error message, app doesn't crash

**Test Invalid HMAC Signature**:
- Temporarily change SERVER_PUBLIC_KEY to wrong value
- Try update check
- Expected: Signature verification fails, rejects response

## Available Test Resources

**Unused Gift Codes** (90 days each):
```
AIRBAMIN-2025-GCIX
AIRBAMIN-2025-3EMB
AIRBAMIN-2025-MI6W
AIRBAMIN-2025-B1SD
```

**API Base URL**:
```
https://tecbamin.com/api/airbamin
```

**API Secret** (for HMAC verification in CryptoUtil.java):
```
3e2431ffc587315ed940778a9bed3b674060a5f3f66d882f85ceef6bb6a8249d
```

**Test License** (already activated on server):
```
License Key: 8fb6fd14-7bad-42c6-8858-569566c30b09
Device ID: test-device-123
Status: Active, 89 days remaining
```

## Expected File Locations

**License Cache** (after activation):
```
Windows: C:\Users\<YourName>\AppData\Roaming\AirBamin\license.enc
Mac: ~/Library/Application Support/AirBamin/license.enc
Linux: ~/.config/AirBamin/license.enc
```

**Verify Cache**:
- File should exist after first activation
- File should be encrypted (binary, not readable JSON)
- Delete file and restart app → should prompt for activation again

## Common Issues & Solutions

**Issue 1: "JAVA_HOME not set"**
Solution:
```bash
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-17
# Mac/Linux
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

**Issue 2: "Connection refused" to API**
- Check internet connection
- Verify URL: https://tecbamin.com/api/airbamin/update
- Test in browser first
- Check firewall/antivirus blocking Java

**Issue 3: "Signature verification failed"**
- Wrong SERVER_PUBLIC_KEY in CryptoUtil.java
- Should be: `3e2431ffc587315ed940778a9bed3b674060a5f3f66d882f85ceef6bb6a8249d`

**Issue 4: "Class not found" errors**
- Missing Jackson dependency in pom.xml
- Run: `./mvnw clean install` to re-download dependencies

**Issue 5: "Device ID returns null"**
- On Windows: Check Windows Registry access
- On Mac/Linux: Falls back to MAC address hash (expected)
- Should still be stable across restarts

**Issue 6: "License cache not found"**
- First run: Normal (not activated yet)
- After activation: Check %APPDATA%/AirBamin/ directory exists
- Check file permissions (app can write to directory)

## Success Criteria

When you complete all steps successfully, you should be able to:

1. ✅ Build the app without errors
2. ✅ Run the app and connect to backend API
3. ✅ Activate a gift code and receive license
4. ✅ Verify license is cached locally (encrypted)
5. ✅ See SecurityGuard enforce different limits based on license
6. ✅ Confirm app works offline using cached license (within 7 days)
7. ✅ See device fingerprinting working consistently

## Final Deliverable

Create a test report with:

1. **Build Status**: Success/Failure + any errors fixed
2. **API Integration**: Screenshots/logs of successful API calls
3. **License Activation**: Screenshot of successful activation response
4. **Cache Location**: Screenshot of license.enc file created
5. **SecurityGuard**: Before/after license file size limits
6. **Offline Test**: App behavior with no internet
7. **Issues Found**: Any bugs or unexpected behavior

## What to Report Back

After testing, provide:

1. ✅ **Build Log** - Was compilation successful?
2. ✅ **API Test Results** - Did all 4 endpoints work?
3. ✅ **License Activation** - Did gift code activation succeed?
4. ✅ **Cache Verification** - Is license.enc created and encrypted?
5. ✅ **Security Enforcement** - Do file size limits change with license?
6. ✅ **Offline Mode** - Does app work without internet?
7. ⚠️ **Issues Found** - Any errors, crashes, or unexpected behavior?

---

**TL;DR**: Build the Java app with Maven, update the API secret in CryptoUtil.java, run the app, test gift code activation, verify license caching works, test offline mode, and confirm SecurityGuard enforcement. Report any issues found.

**Ready to proceed?** Start with Step 1: Verify Java environment and project structure.
