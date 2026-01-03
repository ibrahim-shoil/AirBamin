package com.airbamin.desktop.api;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class LicenseApi {

    private static final String ACTIVATION_URL =
            "https://tecbamin.com/api/airbamin/gift/activate";

    private static final String STATUS_URL =
            "https://tecbamin.com/api/airbamin/license/status";

    private static final String DEACTIVATION_URL =
            "https://tecbamin.com/api/airbamin/license/deactivate";

    private static final HttpClient client = HttpClient.newHttpClient();

    public static String activateLicense(String giftCode, String deviceId) {
        try {
            String json = String.format(
                    "{\"giftCode\":\"%s\",\"deviceId\":\"%s\"}",
                    giftCode, deviceId
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ACTIVATION_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());

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

            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());

            return response.body();

        } catch (Exception e) {
            return "{\"status\":\"error\",\"message\":\"Status request failed\"}";
        }
    }

    public static String deactivateLicense(String licenseKey, String deviceId) {
        try {
            String json = String.format(
                    "{\"licenseKey\":\"%s\",\"deviceId\":\"%s\"}",
                    licenseKey, deviceId
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(DEACTIVATION_URL))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());

            return response.body();

        } catch (Exception e) {
            return "{\"status\":\"error\",\"message\":\"Deactivation failed\"}";
        }
    }
}
