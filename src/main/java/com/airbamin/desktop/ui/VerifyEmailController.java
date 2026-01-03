package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.DesktopAuthService;
import com.airbamin.desktop.storage.LocalStorage;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;

import java.util.concurrent.CompletableFuture;

public class VerifyEmailController {

    @FXML private TextField codeField;
    @FXML private Label subtitleLabel;
    @FXML private Label statusLabel;
    @FXML private Button verifyButton;

    private String email;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (codeField != null) {
                codeField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
        });
    }

    public void setData(String email) {
        this.email = email;
        if (subtitleLabel != null && email != null) {
            subtitleLabel.setText("Enter the code sent to " + email);
        }
    }

    @FXML
    public void onVerify() {
        String code = codeField.getText() == null ? "" : codeField.getText().trim();

        if (code.length() != 6) {
            statusLabel.setText("Please enter the 6-digit code.");
            return;
        }

        if (email == null || email.isBlank()) {
            statusLabel.setText("Session expired. Please start over.");
            return;
        }

        setBusy(true);
        statusLabel.setText("Verifying…");

        final String finalCode = code;
        CompletableFuture
                .supplyAsync(() -> DesktopAuthService.verifyEmail(email, finalCode))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(response)));
    }

    private void handleResponse(DesktopAuthService.LoginResponse response) {
        setBusy(false);

        if (response.isOk()) {
            // Save the session using the correct AccountSession constructor
            LocalStorage.saveAccountSession(
                    new LocalStorage.AccountSession(email, response.token(), response.plan(), 
                            response.expiresAt(), response.features()));
            
            statusLabel.setText("Email verified!");
            statusLabel.setStyle("-fx-text-fill: green;");
            // Navigate to home
            new Thread(() -> {
                try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                Platform.runLater(() -> Navigation.navigate(codeField, "/Home.fxml"));
            }).start();
        } else {
            String errorMessage = switch (response.error()) {
                case "invalid_code" -> "Invalid code. Please check and try again.";
                case "code_expired" -> "Code has expired. Please register again.";
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
