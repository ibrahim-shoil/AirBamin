package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.DesktopAuthService;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;

import java.util.concurrent.CompletableFuture;

public class ForgotPasswordController {

    @FXML private TextField emailField;
    @FXML private Label statusLabel;
    @FXML private Button sendButton;

    private String emailOrUsername;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (emailField != null) {
                emailField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
        });
    }

    public void setEmail(String email) {
        this.emailOrUsername = email;
        if (emailField != null && email != null) {
            emailField.setText(email);
        }
    }

    @FXML
    public void onSendCode() {
        emailOrUsername = emailField.getText() == null ? "" : emailField.getText().trim();

        if (emailOrUsername.isBlank()) {
            statusLabel.setText("Please enter your email or username.");
            return;
        }

        setBusy(true);
        statusLabel.setText("Sending reset code…");

        CompletableFuture
                .supplyAsync(() -> DesktopAuthService.requestPasswordReset(emailOrUsername))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(response)));
    }

    private void handleResponse(DesktopAuthService.SimpleResponse response) {
        setBusy(false);

        if (response.ok()) {
            statusLabel.setText("Reset code sent! Check your email.");
            statusLabel.setStyle("-fx-text-fill: green;");
            // Navigate to reset code screen
            Navigation.navigateWithData(emailField, "/ResetCode.fxml", emailOrUsername);
        } else {
            String errorMessage = switch (response.error()) {
                case "email_not_found", "user_not_found" -> "No account found with that email.";
                case "network_error" -> "Unable to connect. Check your internet.";
                default -> "Failed to send reset code. Try again.";
            };
            statusLabel.setText(errorMessage);
            statusLabel.setStyle("-fx-text-fill: red;");
        }
    }

    @FXML
    public void onBackToLogin() {
        Navigation.navigate(emailField, "/Login.fxml");
    }

    private void setBusy(boolean busy) {
        if (sendButton != null) {
            sendButton.setDisable(busy);
        }
    }
}
