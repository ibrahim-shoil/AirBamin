package com.airbamin.desktop.utils;

import com.airbamin.desktop.api.LicenseApi;
import com.airbamin.desktop.storage.LocalStorage;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import javafx.fxml.FXMLLoader;
import javafx.stage.Stage;

public class LicenseManager {

    public static JsonObject fetchStatusOrRedirect() {
        String key = LocalStorage.loadLicense();
        String deviceId = "DESKTOP-PC";

        if (key == null || key.isEmpty()) {
            redirectToActivation();
            return null;
        }

        try {
            String response = LicenseApi.checkStatus(key, deviceId);
            JsonObject json = JsonParser.parseString(response).getAsJsonObject();

            String status = json.get("status").getAsString();

            if (!status.equalsIgnoreCase("active") &&
                    !status.equalsIgnoreCase("activated") &&
                    !status.equalsIgnoreCase("already_activated")) {

                LocalStorage.deleteLicense();
                redirectToActivation();
                return null;
            }

            return json;

        } catch (Exception e) {
            redirectToActivation();
            return null;
        }
    }

    private static void redirectToActivation() {
        try {
            Stage stage = Stage.getWindows().stream()
                    .filter(w -> w.isShowing())
                    .findFirst()
                    .map(w -> (Stage) w)
                    .orElse(null);

            if (stage != null) {
                String lang = LocalStorage.loadLanguage();
                if (lang == null || lang.isEmpty())
                    lang = "en";
                java.util.Locale locale = lang.equals("ar") ? java.util.Locale.of("ar") : java.util.Locale.of("en");
                java.util.ResourceBundle bundle = java.util.ResourceBundle
                        .getBundle("com.airbamin.desktop.messages_" + lang, locale);

                FXMLLoader loader = new FXMLLoader(LicenseManager.class.getResource("/Activation.fxml"), bundle);
                stage.getScene().setRoot(loader.load());
            }
        } catch (Exception ignored) {
        }
    }
}
