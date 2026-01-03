package com.airbamin.desktop.utils;

import com.airbamin.desktop.AppVersion;
import com.airbamin.desktop.api.UpdateService;
import com.airbamin.desktop.storage.LocalStorage;
import javafx.application.Platform;
import javafx.scene.Node;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.ButtonType;
import javafx.stage.Modality;

import java.text.MessageFormat;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.concurrent.CompletableFuture;

public final class UpdateNotifier {

    private static boolean checkedOnce = false;

    private UpdateNotifier() {
    }

    public static void checkForUpdates(Node owner, boolean showUpToDateMessage) {
        if (owner == null) {
            return;
        }

        if (!showUpToDateMessage && checkedOnce) {
            return;
        }
        checkedOnce = true;

        String token = null;
        LocalStorage.AccountSession session = LocalStorage.loadAccountSession();
        if (session != null) {
            token = session.token();
        }

        String finalToken = token;
        CompletableFuture
                .supplyAsync(() -> UpdateService.checkForUpdates(AppVersion.VERSION, "windows", finalToken,
                        LocalStorage.loadLanguage()))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(owner, response, showUpToDateMessage)));
    }

    private static void handleResponse(Node owner, UpdateService.UpdateResponse response, boolean showUpToDateMessage) {
        ResourceBundle resources = getResourceBundle();

        if (response == null) {
            if (showUpToDateMessage) {
                showInfo(resources.getString("update.failed.title"),
                        resources.getString("update.failed.message"));
            }
            return;
        }

        if (response.sessionRevoked()) {
            AuthManager.handleSessionRevoked(owner, "Your session was revoked. Please sign in again.");
            return;
        }

        if (!response.isOk()) {
            if (showUpToDateMessage) {
                String msg = response.message() != null ? response.message()
                        : resources.getString("update.failed.message");
                showInfo(resources.getString("update.failed.title"), msg);
            }
            return;
        }

        if (!response.updateAvailable()) {
            if (showUpToDateMessage) {
                String message = MessageFormat.format(
                        resources.getString("update.uptodate.message"),
                        AppVersion.VERSION);
                showInfo(resources.getString("update.uptodate.title"), message);
            }
            return;
        }

        if (response.mandatory()) {
            showMandatoryDialog(response, resources);
        } else {
            showOptionalAlert(response, resources);
        }
    }

    private static void showMandatoryDialog(UpdateService.UpdateResponse response, ResourceBundle resources) {
        ButtonType downloadBtn = new ButtonType(resources.getString("update.btn.update_now"),
                ButtonBar.ButtonData.OK_DONE);
        Alert alert = new Alert(Alert.AlertType.INFORMATION, response.releaseNotes(), downloadBtn);
        alert.setTitle(resources.getString("update.required.title"));
        String header = MessageFormat.format(
                resources.getString("update.required.header"),
                response.latestVersion());
        alert.setHeaderText(header);
        alert.initModality(Modality.APPLICATION_MODAL);
        alert.getButtonTypes().setAll(downloadBtn, ButtonType.CLOSE);

        // Apply theme styling and logo
        DialogStyler.styleDialog(alert);

        alert.showAndWait().ifPresent(buttonType -> {
            if (buttonType == downloadBtn) {
                startSilentUpdate(response.downloadUrlDirect());
            }
        });
    }

    private static void showOptionalAlert(UpdateService.UpdateResponse response, ResourceBundle resources) {
        ButtonType downloadBtn = new ButtonType(resources.getString("update.btn.update_now"),
                ButtonBar.ButtonData.OK_DONE);
        ButtonType dismissBtn = new ButtonType(resources.getString("update.available.btn.dismiss"),
                ButtonBar.ButtonData.CANCEL_CLOSE);

        Alert alert = new Alert(Alert.AlertType.INFORMATION, response.releaseNotes(), downloadBtn, dismissBtn);
        alert.setTitle(resources.getString("update.available.title"));
        String header = MessageFormat.format(
                resources.getString("update.available.header"),
                response.latestVersion());
        alert.setHeaderText(header);
        alert.initModality(Modality.NONE);
        alert.getButtonTypes().setAll(downloadBtn, dismissBtn);

        // Apply theme styling and logo
        DialogStyler.styleDialog(alert);

        alert.show();
        alert.resultProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal == downloadBtn) {
                startSilentUpdate(response.downloadUrlDirect());
            }
        });
    }

    private static void startSilentUpdate(String url) {
        if (url == null || url.isBlank()) {
            return;
        }

        ResourceBundle resources = getResourceBundle();
        Alert progressAlert = new Alert(Alert.AlertType.INFORMATION);
        progressAlert.setTitle(resources.getString("update.downloading.title"));
        progressAlert.setHeaderText(resources.getString("update.downloading.header"));
        progressAlert.setContentText(resources.getString("update.downloading.content"));
        progressAlert.initModality(Modality.APPLICATION_MODAL);

        // Remove buttons to prevent closing
        progressAlert.getButtonTypes().clear();

        DialogStyler.styleDialog(progressAlert);
        progressAlert.show();

        CompletableFuture.runAsync(() -> UpdateInstaller.downloadAndInstall(url));
    }

    private static void showInfo(String title, String message) {
        ResourceBundle resources = getResourceBundle();

        // Create custom OK button with localized text
        ButtonType okButton = new ButtonType(resources.getString("app.ok"), ButtonBar.ButtonData.OK_DONE);

        Alert alert = new Alert(Alert.AlertType.INFORMATION, message, okButton);
        alert.setHeaderText(title);
        alert.setTitle(""); // Remove default "Information" title

        // Apply theme styling and logo
        DialogStyler.styleDialog(alert, resources);

        alert.show();
    }

    private static ResourceBundle getResourceBundle() {
        String lang = LocalStorage.loadLanguage();
        if (lang == null || lang.isEmpty()) {
            lang = "en";
        }
        Locale locale = lang.equals("ar") ? new Locale("ar") : new Locale("en");
        return ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);
    }
}
