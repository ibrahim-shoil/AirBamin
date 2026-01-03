package com.airbamin.desktop.utils;

import com.airbamin.desktop.storage.LocalStorage;
import javafx.scene.control.Alert;
import javafx.scene.control.DialogPane;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.stage.Stage;

import java.util.ResourceBundle;

/**
 * Utility class to style JavaFX dialogs with proper theme and localization
 */
public final class DialogStyler {

    private DialogStyler() {
    }

    /**
     * Apply theme styling and logo to an Alert dialog
     */
    public static void styleDialog(Alert alert) {
        styleDialog(alert, null);
    }

    /**
     * Apply theme styling and logo to an Alert dialog with custom resources
     */
    public static void styleDialog(Alert alert, ResourceBundle resources) {
        if (alert == null) {
            return;
        }

        DialogPane dialogPane = alert.getDialogPane();

        // Load theme stylesheet
        String theme = LocalStorage.loadThemeMode();
        if (theme == null || theme.isEmpty()) {
            theme = "light"; // default
        }

        // Clear existing stylesheets first
        dialogPane.getStylesheets().clear();

        // Add theme-specific stylesheet
        if ("dark".equals(theme)) {
            dialogPane.getStylesheets().add(
                    DialogStyler.class.getResource("/css/dialog-dark.css").toExternalForm());
        } else {
            dialogPane.getStylesheets().add(
                    DialogStyler.class.getResource("/css/dialog-light.css").toExternalForm());
        }

        // Apply RTL if Arabic
        String lang = LocalStorage.loadLanguage();
        boolean isArabic = "ar".equals(lang);

        if (isArabic) {
            dialogPane.setNodeOrientation(javafx.geometry.NodeOrientation.RIGHT_TO_LEFT);
        }

        // Replace the default information icon with logo
        try {
            Image logo = new Image(DialogStyler.class.getResourceAsStream("/images/logo.png"));
            if (!logo.isError()) {
                ImageView logoView = new ImageView(logo);
                logoView.setFitWidth(48);
                logoView.setFitHeight(48);
                logoView.setPreserveRatio(true);
                alert.setGraphic(logoView);
            }
        } catch (Exception e) {
            System.err.println("Failed to set dialog graphic: " + e.getMessage());
        }

        // Set stage icon (logo in window title bar) when dialog is shown
        dialogPane.sceneProperty().addListener((obs, oldScene, newScene) -> {
            if (newScene != null && newScene.getWindow() instanceof Stage) {
                Stage stage = (Stage) newScene.getWindow();
                try {
                    Image icon = new Image(DialogStyler.class.getResourceAsStream("/images/logo.png"));
                    if (!icon.isError()) {
                        stage.getIcons().clear(); // Clear any existing icons
                        stage.getIcons().add(icon); // Add logo as window icon in title bar (top-left corner)
                    }
                } catch (Exception e) {
                    System.err.println("Failed to set window icon: " + e.getMessage());
                }
            }
        });
    }
}
