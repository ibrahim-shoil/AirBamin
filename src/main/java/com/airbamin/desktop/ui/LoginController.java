package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.DesktopAuthService;
import com.airbamin.desktop.storage.LocalStorage;
import com.airbamin.desktop.utils.AuthManager;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;

import java.util.concurrent.CompletableFuture;

public class LoginController {

    @FXML
    private TextField emailField;
    @FXML
    private PasswordField passwordField;
    @FXML
    private TextField deviceIdField;
    @FXML
    private Label statusLabel;
    @FXML
    private Button signInButton;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            LocalStorage.AccountSession session = LocalStorage.loadAccountSession();
            if (session != null && emailField != null) {
                emailField.setText(session.email());
            }
            if (deviceIdField != null) {
                deviceIdField.setText(LocalStorage.loadDeviceId());
            }
        });
    }

    @FXML
    public void onSignIn() {
        String email = emailField.getText() == null ? "" : emailField.getText().trim();
        String password = passwordField.getText() == null ? "" : passwordField.getText();
        String deviceId = deviceIdField.getText() == null || deviceIdField.getText().isBlank()
                ? "DESKTOP-PC"
                : deviceIdField.getText().trim();

        if (email.isBlank() || password.isBlank()) {
            statusLabel.setText("Email and password are required.");
            return;
        }

        setBusy(true);
        statusLabel.setText("Signing in…");

        CompletableFuture
                .supplyAsync(() -> DesktopAuthService.login(email, password, deviceId))
                .thenAccept(response -> Platform.runLater(() -> handleLoginResponse(email, deviceId, response)));
    }

    @FXML
    public void onUseActivation() {
        Navigation.navigate(emailField, "/Activation.fxml");
    }

    private void handleLoginResponse(String email, String deviceId, DesktopAuthService.LoginResponse response) {
        setBusy(false);

        if (response == null) {
            statusLabel.setText("Login failed. Try again.");
            return;
        }

        if (response.sessionRevoked()) {
            AuthManager.handleSessionRevoked(statusLabel, "This session was revoked. Please sign in again.");
            return;
        }

        if (!response.isOk()) {
            String message = response.message() != null ? response.message() : "Login failed. Try again.";
            statusLabel.setText(message);
            return;
        }

        LocalStorage.saveAccountSession(
                new LocalStorage.AccountSession(email, response.token(), response.plan(), response.expiresAt(),
                        response.features()));
        LocalStorage.saveDeviceId(deviceId);

        openHome();
    }

    private void openHome() {
        Navigation.navigate(emailField, "/Home.fxml");
        // Update check is handled in HomeController.initialize now
    }

    private void setBusy(boolean busy) {
        if (signInButton != null) {
            signInButton.setDisable(busy);
        }
    }
}
