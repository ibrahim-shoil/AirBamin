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

import java.awt.Desktop;
import java.net.URI;
import java.util.concurrent.CompletableFuture;

public final class UpdateNotifier {

    private static boolean checkedOnce = false;

    private UpdateNotifier() {}

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
                .supplyAsync(() -> UpdateService.checkForUpdates(AppVersion.VERSION, "windows", finalToken))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(owner, response, showUpToDateMessage)));
    }

    private static void handleResponse(Node owner, UpdateService.UpdateResponse response, boolean showUpToDateMessage) {
        if (response == null) {
            if (showUpToDateMessage) {
                showInfo("Update check failed", "Unable to check for updates right now.");
            }
            return;
        }

        if (response.sessionRevoked()) {
            AuthManager.handleSessionRevoked(owner, "Your session was revoked. Please sign in again.");
            return;
        }

        if (!response.isOk()) {
            if (showUpToDateMessage) {
                String msg = response.message() != null ? response.message() : "Unable to check for updates.";
                showInfo("Update check failed", msg);
            }
            return;
        }

        if (!response.updateAvailable()) {
            if (showUpToDateMessage) {
                showInfo("Up to date", "You already have the latest version (" + AppVersion.VERSION + ").");
            }
            return;
        }

        if (response.mandatory()) {
            showMandatoryDialog(response);
        } else {
            showOptionalAlert(response);
        }
    }

    private static void showMandatoryDialog(UpdateService.UpdateResponse response) {
        ButtonType downloadBtn = new ButtonType("Download update", ButtonBar.ButtonData.OK_DONE);
        Alert alert = new Alert(Alert.AlertType.INFORMATION, response.releaseNotes(), downloadBtn);
        alert.setTitle("Update required");
        alert.setHeaderText("A required update is available (" + response.latestVersion() + ")");
        alert.initModality(Modality.APPLICATION_MODAL);
        alert.getButtonTypes().setAll(downloadBtn, ButtonType.CLOSE);

        alert.showAndWait().ifPresent(buttonType -> {
            if (buttonType == downloadBtn) {
                openUrl(response.downloadUrl());
            }
        });
    }

    private static void showOptionalAlert(UpdateService.UpdateResponse response) {
        ButtonType downloadBtn = new ButtonType("Download", ButtonBar.ButtonData.OK_DONE);
        ButtonType dismissBtn = new ButtonType("Dismiss", ButtonBar.ButtonData.CANCEL_CLOSE);

        Alert alert = new Alert(Alert.AlertType.INFORMATION, response.releaseNotes(), downloadBtn, dismissBtn);
        alert.setTitle("Update available");
        alert.setHeaderText("Update available (" + response.latestVersion() + ")");
        alert.initModality(Modality.NONE);
        alert.getButtonTypes().setAll(downloadBtn, dismissBtn);

        alert.show();
        alert.resultProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal == downloadBtn) {
                openUrl(response.downloadUrl());
            }
        });
    }

    private static void openUrl(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        try {
            Desktop.getDesktop().browse(new URI(url));
        } catch (Exception ignored) {}
    }

    private static void showInfo(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION, message, ButtonType.OK);
        alert.setHeaderText(title);
        alert.show();
    }
}
