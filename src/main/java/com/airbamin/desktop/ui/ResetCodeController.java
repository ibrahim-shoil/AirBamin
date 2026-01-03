package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.DesktopAuthService;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;

import java.util.concurrent.CompletableFuture;

public class ResetCodeController {

    @FXML private TextField codeField;
    @FXML private Label statusLabel;
    @FXML private Button verifyButton;

    private String emailOrUsername;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (codeField != null) {
                codeField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
        });
    }

    public void setData(String emailOrUsername) {
        this.emailOrUsername = emailOrUsername;
    }

    @FXML
    public void onVerifyCode() {
        String code = codeField.getText() == null ? "" : codeField.getText().trim();

        if (code.length() != 6) {
            statusLabel.setText("Please enter the 6-digit code.");
            return;
        }

        if (emailOrUsername == null || emailOrUsername.isBlank()) {
            statusLabel.setText("Session expired. Please start over.");
            return;
        }

        setBusy(true);
        statusLabel.setText("Verifying code…");

        final String finalCode = code;
        CompletableFuture
                .supplyAsync(() -> DesktopAuthService.verifyResetCode(emailOrUsername, finalCode))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(finalCode, response)));
    }

    private void handleResponse(String code, DesktopAuthService.SimpleResponse response) {
        setBusy(false);

        if (response.ok()) {
            // Navigate to new password screen with email and code
            Navigation.navigateWithData(codeField, "/NewPassword.fxml", emailOrUsername + "|" + code);
        } else {
            String errorMessage = switch (response.error()) {
                case "invalid_code" -> "Invalid code. Please check and try again.";
                case "code_expired" -> "Code has expired. Request a new one.";
                case "network_error" -> "Unable to connect. Check your internet.";
                default -> "Verification failed. Try again.";
            };
            statusLabel.setText(errorMessage);
            statusLabel.setStyle("-fx-text-fill: red;");
        }
    }

    @FXML
    public void onBackToLogin() {
        Navigation.navigate(codeField, "/Login.fxml");
    }

    private void setBusy(boolean busy) {
        if (verifyButton != null) {
            verifyButton.setDisable(busy);
        }
    }
}
