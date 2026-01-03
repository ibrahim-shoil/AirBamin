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
        // Set macOS dock icon and app name
        setMacOSDockIcon();

        loadFonts();

        // Use Undecorated Stage for custom title bar
        stage.initStyle(javafx.stage.StageStyle.UNDECORATED);

        // --- MIGRATION: Force update default upload directory if it's the old default
        // ---
        try {
            java.nio.file.Path oldDefault = java.nio.file.Paths.get(System.getProperty("user.home"), "Documents",
                    "AirBamin_Uploads");
            java.nio.file.Path newDefault = java.nio.file.Paths.get(System.getProperty("user.home"), "Downloads",
                    "AirBamin", "Transfer");

            java.util.Optional<java.nio.file.Path> currentPath = LocalStorage.loadUploadDirPath();

            if (currentPath.isPresent() && currentPath.get().equals(oldDefault)) {
                LocalStorage.saveUploadDir(newDefault);
                System.out.println("Migrated upload directory from Documents to Downloads/AirBamin/Transfer");
            }
        } catch (Exception e) {
            System.err.println("Migration check failed: " + e.getMessage());
        }
        // -------------------------------------------------------------------------------

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

            // Make layout fill the entire scene (for fullscreen support)
            mainLayout.prefWidthProperty().bind(scene.widthProperty());
            mainLayout.prefHeightProperty().bind(scene.heightProperty());

            applyTheme(scene);

            stage.setTitle("AirBamin");
            setAppIcon(stage);
            stage.setScene(scene);

            // Enable resizing
            com.airbamin.desktop.ui.ResizeHelper.addResizeListener(stage);

            stage.show();
            return;
        }

        // 2. Load Bundle based on language
        java.util.Locale locale = new java.util.Locale(lang.equals("ar") ? "ar" : "en");
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
        javafx.scene.Node titleBarNode = titleLoader.load();
        com.airbamin.desktop.ui.TitleBarController titleController = titleLoader.getController();
        titleController.setTitle(bundle.getString("app.title"));

        mainLayout.setTop(titleBarNode);
        mainLayout.setCenter(contentRoot);

        Scene scene = new Scene(mainLayout, 900, 650);

        // Set scene fill to match app background (prevents black bars in fullscreen)
        scene.setFill(javafx.scene.paint.Color.web("#1f1f1f"));

        // Make layout fill the entire scene (for fullscreen support)
        mainLayout.setMinWidth(0);
        mainLayout.setMinHeight(0);
        mainLayout.setMaxWidth(Double.MAX_VALUE);
        mainLayout.setMaxHeight(Double.MAX_VALUE);
        mainLayout.prefWidthProperty().bind(scene.widthProperty());
        mainLayout.prefHeightProperty().bind(scene.heightProperty());

        // Apply RTL if Arabic
        if (lang.equals("ar")) {
            scene.setNodeOrientation(javafx.geometry.NodeOrientation.RIGHT_TO_LEFT);
        }

        applyTheme(scene);

        stage.setTitle(bundle.getString("app.title"));
        setAppIcon(stage);
        stage.setScene(scene);

        // Enable resizing
        com.airbamin.desktop.ui.ResizeHelper.addResizeListener(stage);

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
            Font.loadFont(getClass().getResourceAsStream("/fonts/BalooBhaijaan2-Bold.ttf"), 12);
            Font.loadFont(getClass().getResourceAsStream("/fonts/BalooBhaijaan2-ExtraBold.ttf"), 12);
        } catch (Exception ignored) {
        }
    }

    private void setMacOSDockIcon() {
        // Set macOS dock icon using java.awt.Taskbar API
        try {
            if (java.awt.Taskbar.isTaskbarSupported()) {
                java.awt.Taskbar taskbar = java.awt.Taskbar.getTaskbar();
                if (taskbar.isSupported(java.awt.Taskbar.Feature.ICON_IMAGE)) {
                    try (var iconStream = getClass().getResourceAsStream("/favicon_io/android-chrome-512x512.png")) {
                        if (iconStream != null) {
                            java.awt.Image awtImage = javax.imageio.ImageIO.read(iconStream);
                            taskbar.setIconImage(awtImage);
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Could not set dock icon: " + e.getMessage());
        }

        // Set app name in macOS menu bar
        System.setProperty("apple.awt.application.name", "Airbamin");
    }

    @Override
    public void stop() throws Exception {
        System.out.println("Application is shutting down...");

        // Stop the local transfer server
        try {
            com.airbamin.desktop.transfer.LocalTransferServer.getInstance().stop();
        } catch (Exception e) {
            System.err.println("Error stopping transfer server: " + e.getMessage());
        }

        super.stop();

        // Force exit to ensure all daemon threads are terminated
        System.exit(0);
    }

    public static void main(String[] args) {
        // Set macOS app name (must be set BEFORE launching JavaFX)
        System.setProperty("apple.awt.application.name", "Airbamin");

        // Fix Arabic letters in JavaFX
        System.setProperty("prism.lcdtext", "false");
        System.setProperty("prism.text", "t2k");
        launch(args);
    }
}
