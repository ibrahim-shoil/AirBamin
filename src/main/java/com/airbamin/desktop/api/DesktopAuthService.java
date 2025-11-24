package com.airbamin.desktop.api;

import com.airbamin.desktop.AppVersion;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class DesktopAuthService {

    private static final String BASE_URL = "https://tecbamin.com";
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static LoginResponse login(String email, String password, String deviceId) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("email", email);
            payload.addProperty("password", password);
            payload.addProperty("device_id", deviceId);
            payload.addProperty("app_version", AppVersion.VERSION);
            payload.addProperty("platform", "windows");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/api/desktop/login"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                    .build();

            HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            return parseLoginResponse(response);
        } catch (Exception e) {
            return LoginResponse.failed("network_error", "Unable to reach server. Check your connection.");
        }
    }

    public static LoginResponse refreshSession(String token) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/api/desktop/subscription"))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            return parseLoginResponse(response);
        } catch (Exception e) {
            return LoginResponse.failed("network_error", "Unable to reach server.");
        }
    }

    private static LoginResponse parseLoginResponse(HttpResponse<String> response) {
        int status = response.statusCode();
        String body = response.body() == null ? "" : response.body().trim();

        JsonObject json = null;
        try {
            json = JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception ignored) {
        }

        if (status == 200 && json != null && json.has("ok") && json.get("ok").getAsBoolean()) {
            String token = json.has("token") ? json.get("token").getAsString() : "";
            String plan = json.has("plan") ? json.get("plan").getAsString() : "";
            String expiresAt = json.has("expires_at") ? json.get("expires_at").getAsString() : "";
            boolean singleDevice = json.has("single_device") && json.get("single_device").getAsBoolean();
            boolean otherDeviceSignedOut = json.has("other_device_signed_out") &&
                    json.get("other_device_signed_out").getAsBoolean();

            List<String> features = new ArrayList<>();
            if (json.has("features") && json.get("features").isJsonArray()) {
                var arr = json.getAsJsonArray("features");
                for (int i = 0; i < arr.size(); i++) {
                    features.add(arr.get(i).getAsString());
                }
            }

            return LoginResponse.success(token, plan, expiresAt, singleDevice, otherDeviceSignedOut, features);
        }

        String errorCode = extractErrorCode(json);
        boolean sessionRevoked = status == 401 && "session_revoked".equalsIgnoreCase(errorCode);
        String message = friendlyMessage(errorCode, status);

        return LoginResponse.failed(errorCode, message, status, sessionRevoked);
    }

    private static String extractErrorCode(JsonObject json) {
        if (json != null && json.has("error")) {
            try {
                return json.get("error").getAsString();
            } catch (Exception ignored) {
            }
        }
        return "unknown_error";
    }

    private static String friendlyMessage(String errorCode, int status) {
        return switch (errorCode) {
            case "invalid_credentials" -> "Invalid email or password.";
            case "no_subscription" -> "No active subscription on this account.";
            case "blocked" -> "This account is blocked. Contact support.";
            case "session_revoked" -> "Signed in elsewhere. Please sign in again.";
            case "network_error" -> "Unable to reach server. Check your connection.";
            default -> status == 401
                    ? "Unauthorized. Please sign in again."
                    : "Login failed. Please try again.";
        };
    }

    public static class LoginResponse {
        private final boolean ok;
        private final String token;
        private final String plan;
        private final String expiresAt;
        private final boolean singleDevice;
        private final boolean otherDeviceSignedOut;
        private final String error;
        private final String message;
        private final boolean sessionRevoked;
        private final List<String> features;
        private final int statusCode;

        private LoginResponse(boolean ok,
                String token,
                String plan,
                String expiresAt,
                boolean singleDevice,
                boolean otherDeviceSignedOut,
                String error,
                String message,
                int statusCode,
                boolean sessionRevoked,
                List<String> features) {
            this.ok = ok;
            this.token = token;
            this.plan = plan;
            this.expiresAt = expiresAt;
            this.singleDevice = singleDevice;
            this.otherDeviceSignedOut = otherDeviceSignedOut;
            this.error = error;
            this.message = message;
            this.statusCode = statusCode;
            this.sessionRevoked = sessionRevoked;
            this.features = features != null ? features : new ArrayList<>();
        }

        public static LoginResponse success(String token,
                String plan,
                String expiresAt,
                boolean singleDevice,
                boolean otherDeviceSignedOut,
                List<String> features) {
            return new LoginResponse(true, token, plan, expiresAt, singleDevice, otherDeviceSignedOut,
                    null, null, 200, false, features);
        }

        public static LoginResponse failed(String error, String message) {
            return new LoginResponse(false, null, null, null, false, false,
                    error, message, 0, false, null);
        }

        public static LoginResponse failed(String error, String message, int statusCode, boolean sessionRevoked) {
            return new LoginResponse(false, null, null, null, false, false,
                    error, message, statusCode, sessionRevoked, null);
        }

        public boolean isOk() {
            return ok;
        }

        public String token() {
            return token;
        }

        public String plan() {
            return plan;
        }

        public String expiresAt() {
            return expiresAt;
        }

        public boolean singleDevice() {
            return singleDevice;
        }

        public boolean otherDeviceSignedOut() {
            return otherDeviceSignedOut;
        }

        public String error() {
            return error;
        }

        public String message() {
            return message;
        }

        public boolean sessionRevoked() {
            return sessionRevoked;
        }

        public int statusCode() {
            return statusCode;
        }

        public List<String> features() {
            return features;
        }
    }
}
