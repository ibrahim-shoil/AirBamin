package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.LicenseApi;
import com.airbamin.desktop.storage.LocalStorage;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.stage.Stage;

import java.util.prefs.Preferences;

public class ActivationController {

    @FXML
    private TextField licenseField;

    @FXML
    private Label statusLabel;

    private java.util.ResourceBundle resources;

    @FXML
    public void initialize() {
        String lang = LocalStorage.loadLanguage();
        if (lang == null || lang.isEmpty())
            lang = "en";
        java.util.Locale locale = lang.equals("ar") ? new java.util.Locale("ar") : new java.util.Locale("en");
        resources = java.util.ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);
    }

    @FXML
    public void onActivate() {
        String key = licenseField.getText().trim();

        if (key.isEmpty()) {
            statusLabel.setText("Enter a license key.");
            return;
        }

        try {
            String response = LicenseApi.activateLicense(key, LocalStorage.loadDeviceId());

            if (response == null || response.isBlank()) {
                statusLabel.setText("Activation failed. Empty server response.");
                return;
            }

            JsonObject json;
            try {
                json = JsonParser.parseString(response).getAsJsonObject();
            } catch (Exception ex) {
                statusLabel.setText("Activation failed. Invalid server response.");
                return;
            }

            String status = json.has("status") ? json.get("status").getAsString() : "";

            if (status.equalsIgnoreCase("active")
                    || status.equalsIgnoreCase("activated")
                    || status.equalsIgnoreCase("already_activated")
                    || status.equalsIgnoreCase("ok")) {

                if (!json.has("licenseKey")) {
                    statusLabel.setText("Error: Server did not return license key.");
                    return;
                }

                String realKey = json.get("licenseKey").getAsString();
                LocalStorage.saveLicense(realKey);

                // WAIT BEFORE LOADING UI
                Thread.sleep(300);

                openHome();
                return;
            }

            String code = json.has("code") ? json.get("code").getAsString() : "";
            String msg;

            switch (code) {
                case "GIFT_CODE_EXHAUSTED":
                    msg = "This code has already been used.";
                    break;
                case "INVALID_GIFT_CODE":
                    msg = "Invalid code. Please check and try again.";
                    break;
                case "GIFT_CODE_EXPIRED":
                    msg = "This code has expired.";
                    break;
                default:
                    msg = json.has("message") ? json.get("message").getAsString() : "Activation failed.";
                    break;
            }

            statusLabel.setText(msg);

        } catch (Exception e) {
            e.printStackTrace();
            statusLabel.setText("Activation failed.");
        }
    }

    private void openHome() {
        try {
            Stage stage = (Stage) licenseField.getScene().getWindow();
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/Home.fxml"), resources);
            stage.getScene().setRoot(loader.load());
        } catch (Exception e) {
            e.printStackTrace();
            statusLabel.setText("Error loading home.");
        }
    }

    @FXML
    public void onUseAccountLogin() {
        Navigation.navigate(licenseField, "/Login.fxml");
    }

    public static class SystemThemeDetector {

        // WINDOWS DARK MODE DETECTION
        public static boolean isDarkTheme() {
            try {
                Preferences systemPrefs = Preferences.systemRoot()
                        .node("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize");

                // Key: AppsUseLightTheme
                int value = systemPrefs.getInt("AppsUseLightTheme", 1);

                // 0 = Dark Mode
                // 1 = Light Mode
                return value == 0;

            } catch (Exception e) {
                // If we can't detect, default to Light
                return false;
            }
        }
    }
}
