package com.airbamin.desktop.storage;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;

public class LocalStorage {

    // -----------------------------------------
    // LICENSE STORAGE
    // -----------------------------------------

    private static final Path LICENSE_FILE = Path.of(System.getProperty("user.home"), ".airbamin_license");

    public static void saveLicense(String key) {
        try {
            JsonObject json = new JsonObject();
            json.addProperty("licenseKey", key);
            Files.writeString(LICENSE_FILE, json.toString());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static String loadLicense() {
        try {
            if (!Files.exists(LICENSE_FILE))
                return null;

            String content = Files.readString(LICENSE_FILE).trim();
            JsonObject json = JsonParser.parseString(content).getAsJsonObject();

            if (json.has("licenseKey")) {
                return json.get("licenseKey").getAsString();
            }

        } catch (Exception ignored) {
        }
        return null;
    }

    public static void deleteLicense() {
        try {
            if (Files.exists(LICENSE_FILE)) {
                Files.delete(LICENSE_FILE);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // -----------------------------------------
    // ACCOUNT SESSION STORAGE
    // -----------------------------------------

    private static final Path ACCOUNT_FILE = Path.of(System.getProperty("user.home"), ".airbamin_account");
    private static final String KEY_ACCOUNT_TOKEN = "token";
    private static final String KEY_ACCOUNT_EMAIL = "email";
    private static final String KEY_ACCOUNT_PLAN = "plan";
    private static final String KEY_ACCOUNT_EXPIRES = "expires_at";
    private static final String KEY_ACCOUNT_FEATURES = "features";

    public static void saveAccountSession(AccountSession session) {
        if (session == null) {
            return;
        }
        try {
            JsonObject json = new JsonObject();
            json.addProperty(KEY_ACCOUNT_TOKEN, session.token());
            json.addProperty(KEY_ACCOUNT_EMAIL, session.email());
            json.addProperty(KEY_ACCOUNT_PLAN, session.plan());
            json.addProperty(KEY_ACCOUNT_EXPIRES, session.expiresAt());

            if (session.features() != null) {
                JsonArray arr = new JsonArray();
                for (String f : session.features()) {
                    arr.add(f);
                }
                json.add(KEY_ACCOUNT_FEATURES, arr);
            }

            Files.writeString(ACCOUNT_FILE, json.toString(),
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception ignored) {
        }
    }

    public static AccountSession loadAccountSession() {
        try {
            if (!Files.exists(ACCOUNT_FILE)) {
                return null;
            }
            String content = Files.readString(ACCOUNT_FILE).trim();
            JsonObject json = JsonParser.parseString(content).getAsJsonObject();

            String token = json.has(KEY_ACCOUNT_TOKEN) ? json.get(KEY_ACCOUNT_TOKEN).getAsString() : "";
            if (token == null || token.isBlank()) {
                return null;
            }

            String email = json.has(KEY_ACCOUNT_EMAIL) ? json.get(KEY_ACCOUNT_EMAIL).getAsString() : "";
            String plan = json.has(KEY_ACCOUNT_PLAN) ? json.get(KEY_ACCOUNT_PLAN).getAsString() : "";
            String expiresAt = json.has(KEY_ACCOUNT_EXPIRES) ? json.get(KEY_ACCOUNT_EXPIRES).getAsString() : "";

            List<String> features = new ArrayList<>();
            if (json.has(KEY_ACCOUNT_FEATURES) && json.get(KEY_ACCOUNT_FEATURES).isJsonArray()) {
                JsonArray arr = json.getAsJsonArray(KEY_ACCOUNT_FEATURES);
                for (int i = 0; i < arr.size(); i++) {
                    features.add(arr.get(i).getAsString());
                }
            }

            return new AccountSession(email, token, plan, expiresAt, features);
        } catch (Exception ignored) {
        }
        return null;
    }

    public static void clearAccountSession() {
        try {
            if (Files.exists(ACCOUNT_FILE)) {
                Files.delete(ACCOUNT_FILE);
            }
        } catch (Exception ignored) {
        }
    }

    public record AccountSession(String email, String token, String plan, String expiresAt, List<String> features) {
    }

    // -----------------------------------------
    // THEME STORAGE (light / dark / system)
    // -----------------------------------------

    private static final Path THEME_FILE = Path.of(System.getProperty("user.home"), ".airbamin_theme");

    /**
     * Save themeMode as string:
     * "light", "dark", "system"
     */
    public static void saveThemeMode(String mode) {
        try {
            JsonObject json = new JsonObject();
            json.addProperty("themeMode", mode); // <-- new key
            Files.writeString(THEME_FILE, json.toString());
        } catch (Exception ignored) {
        }
    }

    /**
     * Load theme mode.
     * DEFAULT = "light"
     */
    public static String loadThemeMode() {
        try {
            if (!Files.exists(THEME_FILE))
                return "light";

            String content = Files.readString(THEME_FILE).trim();
            JsonObject json = JsonParser.parseString(content).getAsJsonObject();

            if (json.has("themeMode")) {
                return json.get("themeMode").getAsString();
            }

        } catch (Exception ignored) {
        }

        return "light"; // default
    }

    // -----------------------------------------
    // LANGUAGE STORAGE
    // -----------------------------------------

    private static final Path LANGUAGE_FILE = Path.of(System.getProperty("user.home"), ".airbamin_language");

    public static void saveLanguage(String lang) {
        try {
            JsonObject json = new JsonObject();
            json.addProperty("language", lang);
            Files.writeString(LANGUAGE_FILE, json.toString());
        } catch (Exception ignored) {
        }
    }

    public static String loadLanguage() {
        try {
            if (!Files.exists(LANGUAGE_FILE))
                return null;

            String content = Files.readString(LANGUAGE_FILE).trim();
            JsonObject json = JsonParser.parseString(content).getAsJsonObject();

            if (json.has("language")) {
                return json.get("language").getAsString();
            }

        } catch (Exception ignored) {
        }
        return null;
    }

    // -----------------------------------------
    // SETTINGS (auto refresh, device id)
    // -----------------------------------------

    private static final Path SETTINGS_FILE = Path.of(System.getProperty("user.home"), ".airbamin_settings");
    private static final String KEY_AUTO_REFRESH = "autoRefresh";
    private static final String KEY_DEVICE_ID = "deviceId";
    private static final String KEY_UPLOAD_DIR = "uploadDir";

    public static boolean loadAutoRefresh() {
        try {
            JsonObject json = readSettings();
            if (json.has(KEY_AUTO_REFRESH)) {
                return json.get(KEY_AUTO_REFRESH).getAsBoolean();
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    public static void saveAutoRefresh(boolean value) {
        try {
            JsonObject json = readSettings();
            json.addProperty(KEY_AUTO_REFRESH, value);
            writeSettings(json);
        } catch (Exception ignored) {
        }
    }

    public static String loadDeviceId() {
        try {
            JsonObject json = readSettings();
            if (json.has(KEY_DEVICE_ID)) {
                return json.get(KEY_DEVICE_ID).getAsString();
            }
        } catch (Exception ignored) {
        }
        return "DESKTOP-PC";
    }

    public static void saveDeviceId(String deviceId) {
        try {
            JsonObject json = readSettings();
            json.addProperty(KEY_DEVICE_ID, deviceId);
            writeSettings(json);
        } catch (Exception ignored) {
        }
    }

    /**
     * Load the saved upload directory path.
     */
    public static java.util.Optional<Path> loadUploadDirPath() {
        try {
            JsonObject json = readSettings();
            if (json.has(KEY_UPLOAD_DIR)) {
                String value = json.get(KEY_UPLOAD_DIR).getAsString();
                if (value != null && !value.isBlank()) {
                    return java.util.Optional.of(Path.of(value));
                }
            }
        } catch (Exception ignored) {
        }
        return java.util.Optional.empty();
    }

    public static void saveUploadDir(Path path) {
        try {
            if (path == null) {
                return;
            }
            JsonObject json = readSettings();
            json.addProperty(KEY_UPLOAD_DIR, path.toString());
            writeSettings(json);
        } catch (Exception ignored) {
        }
    }

    private static JsonObject readSettings() {
        try {
            if (!Files.exists(SETTINGS_FILE)) {
                return new JsonObject();
            }
            String content = Files.readString(SETTINGS_FILE).trim();
            return JsonParser.parseString(content).getAsJsonObject();
        } catch (Exception e) {
            return new JsonObject();
        }
    }

    private static void writeSettings(JsonObject json) {
        try {
            Files.writeString(SETTINGS_FILE, json.toString(), StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception ignored) {
        }
    }
}
