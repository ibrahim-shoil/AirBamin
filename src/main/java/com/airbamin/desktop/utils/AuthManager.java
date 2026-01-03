package com.airbamin.desktop.utils;

import com.airbamin.desktop.storage.LocalStorage;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.stage.Stage;

public final class AuthManager {

    private AuthManager() {
    }

    public static boolean ensureAuthenticated(Node node) {
        if (LocalStorage.loadAccountSession() != null) {
            return true;
        }
        String legacyLicense = LocalStorage.loadLicense();
        if (legacyLicense != null && !legacyLicense.isBlank()) {
            return true;
        }
        redirectToLogin(node);
        return false;
    }

    public static void redirectToLogin(Node node) {
        if (node == null || node.getScene() == null) {
            return;
        }
        Platform.runLater(() -> {
            try {
                Stage stage = (Stage) node.getScene().getWindow();
                String lang = LocalStorage.loadLanguage();
                if (lang == null || lang.isEmpty())
                    lang = "en";
                java.util.Locale locale = lang.equals("ar") ? new java.util.Locale("ar") : new java.util.Locale("en");
                java.util.ResourceBundle bundle = java.util.ResourceBundle
                        .getBundle("com.airbamin.desktop.messages_" + lang, locale);

                FXMLLoader loader = new FXMLLoader(AuthManager.class.getResource("/Login.fxml"), bundle);
                Parent root = loader.load();
                stage.getScene().setRoot(root);
            } catch (Exception ignored) {
            }
        });
    }

    public static void logout(Node node) {
        LocalStorage.clearAccountSession();
        redirectToLogin(node);
    }

    public static void handleSessionRevoked(Node node, String message) {
        LocalStorage.clearAccountSession();
        if (node != null) {
            Platform.runLater(() -> {
                Alert alert = new Alert(Alert.AlertType.WARNING, message, ButtonType.OK);
                alert.setHeaderText("Signed in somewhere else");
                alert.showAndWait();
            });
        }
        redirectToLogin(node);
    }
}
