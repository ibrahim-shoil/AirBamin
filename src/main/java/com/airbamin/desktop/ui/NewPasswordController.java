package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.DesktopAuthService;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;

import java.util.concurrent.CompletableFuture;

public class NewPasswordController {

    @FXML private PasswordField passwordField;
    @FXML private PasswordField confirmPasswordField;
    @FXML private Label statusLabel;
    @FXML private Button resetButton;

    private String emailOrUsername;
    private String code;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (passwordField != null) {
                passwordField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
            if (confirmPasswordField != null) {
                confirmPasswordField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
        });
    }

    public void setData(String data) {
        // Data format: "email|code"
        if (data != null && data.contains("|")) {
            String[] parts = data.split("\\|", 2);
            this.emailOrUsername = parts[0];
            this.code = parts[1];
        }
    }

    @FXML
    public void onResetPassword() {
        String password = passwordField.getText() == null ? "" : passwordField.getText();
        String confirmPassword = confirmPasswordField.getText() == null ? "" : confirmPasswordField.getText();

        if (password.isBlank() || confirmPassword.isBlank()) {
            statusLabel.setText("Please fill in both fields.");
            return;
        }

        if (!password.equals(confirmPassword)) {
            statusLabel.setText("Passwords do not match.");
            return;
        }

        if (!isValidPassword(password)) {
            statusLabel.setText("Password must be at least 8 characters with letters and numbers.");
            return;
        }

        if (emailOrUsername == null || code == null) {
            statusLabel.setText("Session expired. Please start over.");
            return;
        }

        setBusy(true);
        statusLabel.setText("Resetting password…");

        final String finalPassword = password;
        CompletableFuture
                .supplyAsync(() -> DesktopAuthService.resetPassword(emailOrUsername, code, finalPassword))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(response)));
    }

    private boolean isValidPassword(String password) {
        if (password.length() < 8) return false;
        boolean hasLetter = password.matches(".*[a-zA-Z].*");
        boolean hasNumber = password.matches(".*[0-9].*");
        return hasLetter && hasNumber;
    }

    private void handleResponse(DesktopAuthService.SimpleResponse response) {
        setBusy(false);

        if (response.ok()) {
            statusLabel.setText("Password reset successful!");
            statusLabel.setStyle("-fx-text-fill: green;");
            // Navigate to login after short delay
            new Thread(() -> {
                try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
                Platform.runLater(() -> Navigation.navigate(passwordField, "/Login.fxml"));
            }).start();
        } else {
            String errorMessage = switch (response.error()) {
                case "code_expired" -> "Code has expired. Request a new one.";
                case "invalid_code" -> "Invalid code. Please start over.";
                case "network_error" -> "Unable to connect. Check your internet.";
                default -> "Password reset failed. Try again.";
            };
            statusLabel.setText(errorMessage);
            statusLabel.setStyle("-fx-text-fill: red;");
        }
    }

    private void setBusy(boolean busy) {
        if (resetButton != null) {
            resetButton.setDisable(busy);
        }
    }
}
