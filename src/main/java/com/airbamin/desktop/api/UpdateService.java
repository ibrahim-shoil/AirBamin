package com.airbamin.desktop.api;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

public class UpdateService {

    private static final String BASE_URL = "https://tecbamin.com";
    private static final HttpClient CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static UpdateResponse checkForUpdates(String currentVersion, String platform, String bearerToken,
            String language) {
        try {
            String safePlatform = (platform == null || platform.isBlank()) ? "windows" : platform;

            String query = String.format("?version=%s&platform=%s&lang=%s",
                    encode(currentVersion), encode(safePlatform), encode(language));

            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + "/api/desktop/update" + query))
                    .timeout(Duration.ofSeconds(10))
                    .GET();

            if (bearerToken != null && !bearerToken.isBlank()) {
                builder.header("Authorization", "Bearer " + bearerToken);
            }

            HttpResponse<String> response = CLIENT.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return parseResponse(response, currentVersion);
        } catch (Exception e) {
            return UpdateResponse.failed("network_error", "Unable to reach update server.");
        }
    }

    private static UpdateResponse parseResponse(HttpResponse<String> response, String currentVersion) {
        int status = response.statusCode();
        String body = response.body() == null ? "" : response.body().trim();

        JsonObject json = null;
        try {
            json = JsonParser.parseString(body).getAsJsonObject();
        } catch (Exception ignored) {
        }

        String errorCode = json != null && json.has("error") ? json.get("error").getAsString() : "unknown_error";
        boolean sessionRevoked = status == 401 && "session_revoked".equalsIgnoreCase(errorCode);

        if (status != 200 || json == null) {
            return UpdateResponse.failed(errorCode, "Unable to check for updates.", status, sessionRevoked);
        }

        String latestVersion = json.has("latest_version") ? json.get("latest_version").getAsString() : currentVersion;
        boolean mandatory = json.has("mandatory") && json.get("mandatory").getAsBoolean();
        String downloadUrl = json.has("download_url") ? json.get("download_url").getAsString() : "";
        String downloadUrlDirect = json.has("download_url_direct") ? json.get("download_url_direct").getAsString() : "";
        String releaseNotes = json.has("release_notes_selected")
                && !json.get("release_notes_selected").getAsString().isEmpty()
                        ? json.get("release_notes_selected").getAsString()
                        : (json.has("release_notes") ? json.get("release_notes").getAsString() : "");

        boolean updateAvailable = mandatory || isNewerVersion(latestVersion, currentVersion);
        return UpdateResponse.success(updateAvailable, mandatory, latestVersion, downloadUrl, downloadUrlDirect,
                releaseNotes, status,
                sessionRevoked);
    }

    private static boolean isNewerVersion(String latest, String current) {
        if (latest == null || current == null) {
            return false;
        }

        String[] latestParts = latest.split("\\.");
        String[] currentParts = current.split("\\.");
        int max = Math.max(latestParts.length, currentParts.length);

        for (int i = 0; i < max; i++) {
            int l = i < latestParts.length ? parseInt(latestParts[i]) : 0;
            int c = i < currentParts.length ? parseInt(currentParts[i]) : 0;
            if (l > c) {
                return true;
            }
            if (l < c) {
                return false;
            }
        }
        return false;
    }

    private static int parseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    public static class UpdateResponse {
        private final boolean ok;
        private final boolean updateAvailable;
        private final boolean mandatory;
        private final String latestVersion;
        private final String downloadUrl;
        private final String downloadUrlDirect;
        private final String releaseNotes;
        private final String error;
        private final String message;
        private final int statusCode;
        private final boolean sessionRevoked;

        private UpdateResponse(boolean ok,
                boolean updateAvailable,
                boolean mandatory,
                String latestVersion,
                String downloadUrl,
                String downloadUrlDirect,
                String releaseNotes,
                String error,
                String message,
                int statusCode,
                boolean sessionRevoked) {
            this.ok = ok;
            this.updateAvailable = updateAvailable;
            this.mandatory = mandatory;
            this.latestVersion = latestVersion;
            this.downloadUrl = downloadUrl;
            this.downloadUrlDirect = downloadUrlDirect;
            this.releaseNotes = releaseNotes;
            this.error = error;
            this.message = message;
            this.statusCode = statusCode;
            this.sessionRevoked = sessionRevoked;
        }

        public static UpdateResponse success(boolean updateAvailable,
                boolean mandatory,
                String latestVersion,
                String downloadUrl,
                String downloadUrlDirect,
                String releaseNotes,
                int statusCode,
                boolean sessionRevoked) {
            return new UpdateResponse(true, updateAvailable, mandatory, latestVersion, downloadUrl, downloadUrlDirect,
                    releaseNotes,
                    null, null, statusCode, sessionRevoked);
        }

        public static UpdateResponse failed(String error, String message) {
            return new UpdateResponse(false, false, false, null, null, null, null,
                    error, message, 0, false);
        }

        public static UpdateResponse failed(String error, String message, int statusCode, boolean sessionRevoked) {
            return new UpdateResponse(false, false, false, null, null, null, null,
                    error, message, statusCode, sessionRevoked);
        }

        public boolean isOk() {
            return ok;
        }

        public boolean updateAvailable() {
            return updateAvailable;
        }

        public boolean mandatory() {
            return mandatory;
        }

        public String latestVersion() {
            return latestVersion;
        }

        public String downloadUrl() {
            return downloadUrl;
        }

        public String downloadUrlDirect() {
            return downloadUrlDirect;
        }

        public String releaseNotes() {
            return releaseNotes;
        }

        public String error() {
            return error;
        }

        public String message() {
            return message;
        }

        public int statusCode() {
            return statusCode;
        }

        public boolean sessionRevoked() {
            return sessionRevoked;
        }
    }
}
