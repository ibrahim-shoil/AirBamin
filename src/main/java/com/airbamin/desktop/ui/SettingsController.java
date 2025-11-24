package com.airbamin.desktop.ui;

import com.airbamin.desktop.storage.LocalStorage;
import com.airbamin.desktop.utils.AuthManager;
import com.airbamin.desktop.utils.UpdateNotifier;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.CheckBox;
import javafx.scene.control.TextField;
import javafx.stage.DirectoryChooser;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class SettingsController {

    @FXML
    private CheckBox autoRefreshCheck;
    @FXML
    private TextField deviceIdField;
    @FXML
    private TextField uploadDirField;
    @FXML
    private javafx.scene.control.ComboBox<String> languageCombo;
    @FXML
    private javafx.scene.control.ComboBox<String> themeCombo;

    private Path selectedUploadDir;

    // -------------------------------------------------------------
    // INITIALIZE
    // -------------------------------------------------------------
    @FXML
    public void initialize() {

        if (!AuthManager.ensureAuthenticated(autoRefreshCheck)) {
            return;
        }

        Platform.runLater(() -> {

            // Language Setup
            languageCombo.getItems().addAll("English", "العربية");
            String currentLang = LocalStorage.loadLanguage();
            if ("ar".equals(currentLang)) {
                languageCombo.setValue("العربية");
            } else {
                languageCombo.setValue("English");
            }

            // Theme Setup
            themeCombo.getItems().addAll("Light", "Dark", "System");
            String currentTheme = LocalStorage.loadThemeMode();
            if (ThemeManager.THEME_DARK.equalsIgnoreCase(currentTheme)) {
                themeCombo.setValue("Dark");
            } else if (ThemeManager.THEME_SYSTEM.equalsIgnoreCase(currentTheme)) {
                themeCombo.setValue("System");
            } else {
                themeCombo.setValue("Light");
            }

            autoRefreshCheck.setSelected(LocalStorage.loadAutoRefresh());
            deviceIdField.setText(LocalStorage.loadDeviceId());
            selectedUploadDir = LocalStorage.loadUploadDirPath()
                    .orElse(Paths.get(System.getProperty("user.home"), "Documents", "AirBamin_Uploads"));
            uploadDirField.setText(selectedUploadDir.toString());
            uploadDirField.setEditable(false);
        });
    }

    // -------------------------------------------------------------
    // SAVE
    // -------------------------------------------------------------
    @FXML
    public void onSave() {
        // Save Theme
        String selectedTheme = themeCombo.getValue();
        String themeMode = ThemeManager.THEME_LIGHT;
        if ("Dark".equalsIgnoreCase(selectedTheme)) {
            themeMode = ThemeManager.THEME_DARK;
        } else if ("System".equalsIgnoreCase(selectedTheme)) {
            themeMode = ThemeManager.THEME_SYSTEM;
        }
        LocalStorage.saveThemeMode(themeMode);

        // Apply Theme Immediately
        ThemeManager.applyTheme(themeCombo.getScene(), themeMode);

        LocalStorage.saveAutoRefresh(autoRefreshCheck.isSelected());

        String deviceId = deviceIdField.getText() == null || deviceIdField.getText().isBlank()
                ? "DESKTOP-PC"
                : deviceIdField.getText().trim();
        LocalStorage.saveDeviceId(deviceId);

        if (selectedUploadDir != null) {
            LocalStorage.saveUploadDir(selectedUploadDir);
            com.airbamin.desktop.transfer.LocalTransferServer.getInstance().updateUploadDir(selectedUploadDir);
        }

        // Save Language
        String selectedLang = languageCombo.getValue();
        String langCode = "العربية".equals(selectedLang) ? "ar" : "en";
        String oldLang = LocalStorage.loadLanguage();

        if (!langCode.equals(oldLang)) {
            LocalStorage.saveLanguage(langCode);
            // Restart app to apply language change
            try {
                javafx.stage.Stage stage = (javafx.stage.Stage) languageCombo.getScene().getWindow();
                stage.close();
                new com.airbamin.desktop.Main().start(new javafx.stage.Stage());
            } catch (Exception e) {
                e.printStackTrace();
            }
            return;
        }

        returnToHome();
    }

    // -------------------------------------------------------------
    @FXML
    public void onCancel() {
        returnToHome();
    }

    @FXML
    public void onBrowseUploadDir() {
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("Select Upload Destination");
        if (selectedUploadDir != null && Files.exists(selectedUploadDir)) {
            chooser.setInitialDirectory(selectedUploadDir.toFile());
        }
        var chosen = chooser.showDialog(uploadDirField.getScene().getWindow());
        if (chosen != null) {
            selectedUploadDir = chosen.toPath();
            uploadDirField.setText(selectedUploadDir.toString());
        }
    }

    @FXML
    public void onCheckUpdates() {
        UpdateNotifier.checkForUpdates(deviceIdField, true);
    }

    // -------------------------------------------------------------
    // RETURN TO DASHBOARD + REFRESH DATA
    // -------------------------------------------------------------
    private void returnToHome() {
        Navigation.navigate(uploadDirField, "/Home.fxml");
    }
}
