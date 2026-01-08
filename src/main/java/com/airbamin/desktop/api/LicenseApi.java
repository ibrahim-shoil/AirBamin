package com.airbamin.desktop.api;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import com.google.gson.*;

public class LicenseApi {

        private static final String ACTIVATION_URL = "https://tecbamin.com/api/airbamin/gift/activate";

        private static final String STATUS_URL = "https://tecbamin.com/api/airbamin/license/status";

        private static final String DEACTIVATION_URL = "https://tecbamin.com/api/airbamin/license/deactivate";

        private static final HttpClient client = HttpClient.newHttpClient();

        // HMAC secret key (hex-encoded) - must match server configuration
        private static final String AIRBAMIN_SECRET_KEY = "6a3f8e2b1c9d5a7e4f0b8c1a3e6d9f2b5c8a1e4d7f0b3c6a9e2d5f8b1c4a7e0d";

        /**
         * Verify HMAC-SHA256 signature of API response
         * Matches Python implementation on server: sorted JSON, no spaces
         */
        private static boolean verifySignature(JsonObject response) {
                try {
                        if (!response.has("signature")) {
                                System.err.println("[LicenseApi] Response missing signature field");
                                return false;
                        }

                        String receivedSignature = response.get("signature").getAsString();

                        // Create copy without signature field
                        JsonObject dataCopy = new JsonObject();
                        for (Map.Entry<String, JsonElement> entry : response.entrySet()) {
                                if (!"signature".equals(entry.getKey())) {
                                        dataCopy.add(entry.getKey(), entry.getValue());
                                }
                        }

                        // Generate deterministic JSON: sorted keys, no spaces (matches Python)
                        Gson gson = new GsonBuilder().create();

                        // Sort JSON manually using TreeMap
                        TreeMap<String, Object> sortedMap = new TreeMap<>();
                        for (Map.Entry<String, JsonElement> entry : dataCopy.entrySet()) {
                                sortedMap.put(entry.getKey(), gson.fromJson(entry.getValue(), Object.class));
                        }
                        String payload = gson.toJson(sortedMap);
                        payload = payload.replace(" ", ""); // Remove all spaces

                        // Compute HMAC-SHA256
                        byte[] secretBytes = hexStringToByteArray(AIRBAMIN_SECRET_KEY);
                        Mac mac = Mac.getInstance("HmacSHA256");
                        SecretKeySpec secretKey = new SecretKeySpec(secretBytes, "HmacSHA256");
                        mac.init(secretKey);
                        byte[] hmacBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

                        String computedSignature = bytesToHex(hmacBytes);

                        boolean valid = computedSignature.equalsIgnoreCase(receivedSignature);
                        if (!valid) {
                                System.err.println("[LicenseApi] Signature verification failed!");
                                System.err.println("[LicenseApi] Payload: " + payload);
                                System.err.println("[LicenseApi] Expected: " + receivedSignature);
                                System.err.println("[LicenseApi] Computed: " + computedSignature);
                        }
                        return valid;

                } catch (Exception e) {
                        System.err.println("[LicenseApi] Signature verification error: " + e.getMessage());
                        e.printStackTrace();
                        return false;
                }
        }

        private static byte[] hexStringToByteArray(String hex) {
                int len = hex.length();
                byte[] data = new byte[len / 2];
                for (int i = 0; i < len; i += 2) {
                        data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                        + Character.digit(hex.charAt(i + 1), 16));
                }
                return data;
        }

        private static String bytesToHex(byte[] bytes) {
                StringBuilder result = new StringBuilder();
                for (byte b : bytes) {
                        result.append(String.format("%02x", b));
                }
                return result.toString();
        }

        public static String activateLicense(String giftCode, String deviceId) {
                try {
                        String json = String.format(
                                        "{\"giftCode\":\"%s\",\"deviceId\":\"%s\"}",
                                        giftCode, deviceId);

                        HttpRequest request = HttpRequest.newBuilder()
                                        .uri(URI.create(ACTIVATION_URL))
                                        .header("Content-Type", "application/json")
                                        .POST(HttpRequest.BodyPublishers.ofString(json))
                                        .build();

                        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                        // Verify signature
                        JsonObject responseJson = JsonParser.parseString(response.body()).getAsJsonObject();
                        if (!verifySignature(responseJson)) {
                                return "{\"status\":\"error\",\"message\":\"Invalid response signature\"}";
                        }

                        return response.body();

                } catch (Exception e) {
                        return "{\"status\":\"error\",\"message\":\"Activation failed\"}";
                }
        }

        public static String checkStatus(String licenseKey, String deviceId) {
                try {
                        HttpRequest request = HttpRequest.newBuilder()
                                        .uri(URI.create(STATUS_URL))
                                        .header("X-License-Key", licenseKey)
                                        .header("X-Device-ID", deviceId)
                                        .GET()
                                        .build();

                        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                        // Verify signature
                        JsonObject responseJson = JsonParser.parseString(response.body()).getAsJsonObject();
                        if (!verifySignature(responseJson)) {
                                return "{\"status\":\"error\",\"message\":\"Invalid response signature\"}";
                        }

                        return response.body();

                } catch (Exception e) {
                        return "{\"status\":\"error\",\"message\":\"Status request failed\"}";
                }
        }

        public static String deactivateLicense(String licenseKey, String deviceId) {
                try {
                        String json = String.format(
                                        "{\"licenseKey\":\"%s\",\"deviceId\":\"%s\"}",
                                        licenseKey, deviceId);

                        HttpRequest request = HttpRequest.newBuilder()
                                        .uri(URI.create(DEACTIVATION_URL))
                                        .header("Content-Type", "application/json")
                                        .POST(HttpRequest.BodyPublishers.ofString(json))
                                        .build();

                        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                        return response.body();

                } catch (Exception e) {
                        return "{\"status\":\"error\",\"message\":\"Deactivation failed\"}";
                }
        }
}
