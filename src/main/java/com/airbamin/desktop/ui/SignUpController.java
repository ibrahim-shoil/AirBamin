package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.DesktopAuthService;
import com.airbamin.desktop.storage.LocalStorage;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;

import java.util.concurrent.CompletableFuture;

public class SignUpController {

    @FXML private TextField usernameField;
    @FXML private TextField nameField;
    @FXML private TextField emailField;
    @FXML private PasswordField passwordField;
    @FXML private PasswordField confirmPasswordField;
    @FXML private Label statusLabel;
    @FXML private Button signUpButton;

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            // Force text fields to be left-to-right for input
            if (usernameField != null) {
                usernameField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
            if (nameField != null) {
                nameField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
            if (emailField != null) {
                emailField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
            if (passwordField != null) {
                passwordField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
            if (confirmPasswordField != null) {
                confirmPasswordField.setNodeOrientation(javafx.geometry.NodeOrientation.LEFT_TO_RIGHT);
            }
        });
    }

    @FXML
    public void onSignUp() {
        String username = usernameField.getText() == null ? "" : usernameField.getText().trim();
        String name = nameField.getText() == null ? "" : nameField.getText().trim();
        String email = emailField.getText() == null ? "" : emailField.getText().trim();
        String password = passwordField.getText() == null ? "" : passwordField.getText();
        String confirmPassword = confirmPasswordField.getText() == null ? "" : confirmPasswordField.getText();

        if (username.isBlank() || name.isBlank() || email.isBlank() || password.isBlank() || confirmPassword.isBlank()) {
            statusLabel.setText("All fields are required.");
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

        setBusy(true);
        statusLabel.setText("Creating account…");

        CompletableFuture
                .supplyAsync(() -> DesktopAuthService.register(name, username, email, password))
                .thenAccept(response -> Platform.runLater(() -> handleResponse(email, response)));
    }

    private boolean isValidPassword(String password) {
        if (password.length() < 8) return false;
        boolean hasLetter = password.matches(".*[a-zA-Z].*");
        boolean hasNumber = password.matches(".*[0-9].*");
        return hasLetter && hasNumber;
    }

    private void handleResponse(String email, DesktopAuthService.RegistrationResponse response) {
        setBusy(false);

        if (response.ok()) {
            if (response.verificationRequired()) {
                // Navigate to verify email screen
                Navigation.navigateWithData(emailField, "/VerifyEmail.fxml", email);
            } else {
                statusLabel.setText("Account created! You can now sign in.");
                statusLabel.setStyle("-fx-text-fill: green;");
                // Navigate to login after short delay
                Platform.runLater(() -> {
                    try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
                    Navigation.navigate(emailField, "/Login.fxml");
                });
            }
        } else {
            String errorMessage = switch (response.error()) {
                case "email_in_use", "email_exists" -> "Email is already in use.";
                case "username_in_use", "username_exists", "username_taken" -> {
                    if (response.suggestedUsername() != null) {
                        yield "Username is taken. Try: " + response.suggestedUsername();
                    }
                    yield "Username is already in use.";
                }
                case "invalid_email" -> "Invalid email address.";
                case "weak_password" -> "Password is too weak.";
                case "network_error" -> "Unable to connect. Check your internet.";
                default -> "Registration failed. Please try again.";
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
        if (signUpButton != null) {
            signUpButton.setDisable(busy);
        }
    }
}
