package com.airbamin.desktop;

import com.airbamin.desktop.api.LicenseApi;
import com.airbamin.desktop.storage.LocalStorage;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.image.Image;
import javafx.scene.Scene;
import javafx.scene.text.Font;
import javafx.stage.Stage;

public class Main extends Application {

    @Override
    public void start(Stage stage) throws Exception {
        loadFonts();

        // Use Undecorated Stage for custom title bar
        stage.initStyle(javafx.stage.StageStyle.UNDECORATED);

        // 1. Check Language
        String lang = LocalStorage.loadLanguage();
        if (lang == null || lang.isBlank()) {
            // Show Language Selection
            java.util.ResourceBundle bundle = java.util.ResourceBundle.getBundle("com.airbamin.desktop.messages_en");
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/LanguageSelection.fxml"), bundle);
            javafx.scene.Parent root = loader.load();

            // Wrap with Title Bar
            javafx.scene.layout.BorderPane mainLayout = new javafx.scene.layout.BorderPane();
            FXMLLoader titleLoader = new FXMLLoader(getClass().getResource("/components/TitleBar.fxml"));
            mainLayout.setTop(titleLoader.load());
            mainLayout.setCenter(root);

            Scene scene = new Scene(mainLayout, 600, 400);
            applyTheme(scene);

            // Enable resizing
            com.airbamin.desktop.ui.ResizeHelper.addResizeListener(stage);

            stage.setTitle("AirBamin");
            setAppIcon(stage);
            stage.setScene(scene);
            stage.show();
            return;
        }

        // 2. Load Bundle based on language
        java.util.Locale locale = java.util.Locale.of(lang.equals("ar") ? "ar" : "en");
        java.util.ResourceBundle bundle = java.util.ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang,
                locale);

        // 3. Determine Start Screen
        LocalStorage.AccountSession savedSession = LocalStorage.loadAccountSession();
        String savedKey = LocalStorage.loadLicense();
        FXMLLoader loader;

        if (savedSession != null) {
            loader = new FXMLLoader(getClass().getResource("/Home.fxml"), bundle);
        } else if (savedKey == null || savedKey.trim().isEmpty()) {
            loader = new FXMLLoader(getClass().getResource("/Login.fxml"), bundle);
        } else {

            String response = LicenseApi.checkStatus(savedKey, LocalStorage.loadDeviceId());
            boolean openActivation = false;

            try {
                JsonObject json = JsonParser.parseString(response).getAsJsonObject();
                String status = json.has("status") ? json.get("status").getAsString() : "";

                if (status.equalsIgnoreCase("expired") ||
                        status.equalsIgnoreCase("inactive") ||
                        status.equalsIgnoreCase("error") ||
                        status.equalsIgnoreCase("not_found")) {
                    openActivation = true;
                }

            } catch (Exception e) {
                openActivation = true;
            }

            loader = new FXMLLoader(
                    getClass().getResource(openActivation ? "/Activation.fxml" : "/Home.fxml"),
                    bundle);
        }

        javafx.scene.Parent contentRoot = loader.load();

        // Wrap with Title Bar
        javafx.scene.layout.BorderPane mainLayout = new javafx.scene.layout.BorderPane();
        FXMLLoader titleLoader = new FXMLLoader(getClass().getResource("/components/TitleBar.fxml"));
        mainLayout.setTop(titleLoader.load());
        mainLayout.setCenter(contentRoot);

        Scene scene = new Scene(mainLayout, 900, 650);

        // Apply RTL if Arabic
        if (lang.equals("ar")) {
            scene.setNodeOrientation(javafx.geometry.NodeOrientation.RIGHT_TO_LEFT);
        }

        applyTheme(scene);

        // Enable resizing
        com.airbamin.desktop.ui.ResizeHelper.addResizeListener(stage);

        stage.setTitle(bundle.getString("app.title"));
        setAppIcon(stage);
        stage.setScene(scene);
        stage.show();
    }

    private void applyTheme(Scene scene) {
        String themeMode = LocalStorage.loadThemeMode();
        com.airbamin.desktop.ui.ThemeManager.applyTheme(scene, themeMode);
    }

    private void setAppIcon(Stage stage) {
        try (var iconStream = getClass().getResourceAsStream("/favicon_io/android-chrome-512x512.png")) {
            if (iconStream != null) {
                stage.getIcons().add(new Image(iconStream));
            }
        } catch (Exception ignored) {
        }
    }

    private void loadFonts() {
        try {
            Font.loadFont(getClass().getResourceAsStream("/fonts/Cairo-Regular.ttf"), 12);
            Font.loadFont(getClass().getResourceAsStream("/fonts/Cairo-Bold.ttf"), 12);
            Font.loadFont(getClass().getResourceAsStream("/fonts/Cairo-SemiBold.ttf"), 12);
        } catch (Exception ignored) {
        }
    }

    public static void main(String[] args) {
        launch();
    }
}
