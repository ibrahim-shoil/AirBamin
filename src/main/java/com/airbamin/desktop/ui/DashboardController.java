package com.airbamin.desktop.ui;

import com.airbamin.desktop.api.LicenseApi;
import com.airbamin.desktop.storage.LocalStorage;
import com.airbamin.desktop.utils.AuthManager;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Pane;
import javafx.scene.layout.StackPane;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class DashboardController {

    @FXML
    private Label statusBadge;
    @FXML
    private Label planLabel;
    @FXML
    private Label emailLabel;
    @FXML
    private Label daysLabel;
    @FXML
    private Label expiryLabel;
    @FXML
    private Label deviceIdLabel;
    @FXML
    private HBox featuresBox;
    @FXML
    private javafx.scene.control.Button signOutButton;

    @FXML
    private StackPane themeToggle;
    @FXML
    private Circle themeKnob;

    private java.util.ResourceBundle resources;

    private String getString(String key) {
        if (resources == null)
            return key;
        try {
            return resources.getString(key);
        } catch (Exception e) {
            return key;
        }
    }

    // -------------------------------------------------------------
    // INITIALIZE (SAFE)
    // -------------------------------------------------------------
    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (!AuthManager.ensureAuthenticated(statusBadge)) {
                return;
            }
            loadThemeFromStorage();

            // Load resources
            String lang = LocalStorage.loadLanguage();
            if (lang == null || lang.isEmpty())
                lang = "en";
            java.util.Locale locale = lang.equals("ar") ? java.util.Locale.of("ar") : java.util.Locale.of("en");
            resources = java.util.ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

            setupThemeToggle();
            loadStatus();
        });
    }

    // -------------------------------------------------------------
    // FORCE RELOAD (CALLED AFTER SETTINGS SAVE)
    // -------------------------------------------------------------
    public void forceReload() {
        loadThemeFromStorage();
        loadStatus();
    }

    // -------------------------------------------------------------
    // LOAD THEME FROM STORAGE
    // -------------------------------------------------------------
    private void loadThemeFromStorage() {
        // light theme only
    }

    // -------------------------------------------------------------
    // THEME TOGGLE
    // -------------------------------------------------------------
    private void setupThemeToggle() {
        if (themeToggle == null) {
            return;
        }
        themeToggle.setOnMouseClicked(event -> {
            // no-op toggler removed
        });
    }

    // -------------------------------------------------------------
    // REFRESH BUTTON
    // -------------------------------------------------------------
    @FXML
    public void onRefresh() {
        if (!AuthManager.ensureAuthenticated(statusBadge)) {
            return;
        }
        loadStatus();
    }

    // -------------------------------------------------------------
    // OPEN SETTINGS
    // -------------------------------------------------------------
    @FXML
    public void openSettings() {
        Navigation.navigate(statusBadge, "/Settings.fxml");
    }

    @FXML
    public void openTransfer() {
        Navigation.navigate(statusBadge, "/Transfer.fxml");
    }

    // -------------------------------------------------------------
    // CONTACT
    // -------------------------------------------------------------
    @FXML
    public void onContact() {
        try {
            java.awt.Desktop.getDesktop().browse(
                    new java.net.URI("https://tecbamin.com/contact"));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // -------------------------------------------------------------
    // SIGN OUT
    // -------------------------------------------------------------

    // -------------------------------------------------------------
    // DEACTIVATE LICENSE
    // -------------------------------------------------------------
    @FXML
    public void onDeactivate() {
        if (!AuthManager.ensureAuthenticated(statusBadge)) {
            return;
        }
        try {
            String savedKey = LocalStorage.loadLicense();
            if (savedKey == null || savedKey.isEmpty()) {
                statusBadge.setText(getString("dashboard.status.no_license_deactivate"));
                openActivation();
                return;
            }

            String deviceId = LocalStorage.loadDeviceId();

            try {
                LicenseApi.deactivateLicense(savedKey, deviceId);
            } catch (Exception ignored) {
            }
            try {
                LocalStorage.deleteLicense();
            } catch (Exception ignored) {
            }

            statusBadge.setText(getString("dashboard.status.license_deactivated"));
            openActivation();

        } catch (Exception e) {
            statusBadge.setText(getString("dashboard.status.failed_deactivate"));
            openActivation();
        }
    }

    private void openActivation() {
        try {
            Stage stage = (Stage) statusBadge.getScene().getWindow();
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/Activation.fxml"), resources);
            Pane root = loader.load();
            stage.getScene().setRoot(root);
        } catch (Exception e) {
            e.printStackTrace();
            statusBadge.setText("Error loading activation screen.");
        }
    }

    // -------------------------------------------------------------
    // LOAD STATUS
    // -------------------------------------------------------------
    private void loadStatus() {
        LocalStorage.AccountSession session = LocalStorage.loadAccountSession();

        if (signOutButton != null) {
            String savedKey = LocalStorage.loadLicense();
            boolean isEmailSession = (session != null);
            boolean isActivationSession = (savedKey != null && !savedKey.isEmpty());

            // Show button if either session type exists
            signOutButton.setVisible(isEmailSession || isActivationSession);
            signOutButton.setManaged(isEmailSession || isActivationSession);
        }

        if (session != null) {
            // Try to refresh session from server
            try {
                com.airbamin.desktop.api.DesktopAuthService.LoginResponse refreshed = com.airbamin.desktop.api.DesktopAuthService
                        .refreshSession(session.token());

                if (refreshed != null && refreshed.isOk()) {
                    // Update local storage with new details
                    LocalStorage.AccountSession newSession = new LocalStorage.AccountSession(
                            session.email(),
                            session.token(), // Keep original token
                            refreshed.plan(),
                            refreshed.expiresAt(),
                            refreshed.features());
                    LocalStorage.saveAccountSession(newSession);
                    fillFromAccountSession(newSession);
                } else {
                    // Fallback to cached session if refresh fails
                    fillFromAccountSession(session);
                }
            } catch (Exception e) {
                fillFromAccountSession(session);
            }
            return;
        }

        try {
            String savedKey = LocalStorage.loadLicense();
            String deviceId = LocalStorage.loadDeviceId();

            if (savedKey == null || savedKey.isEmpty()) {
                statusBadge.setText(getString("dashboard.status.no_license"));
                openActivation();
                return;
            }

            String response = LicenseApi.checkStatus(savedKey, deviceId);
            if (response == null || response.trim().isEmpty()) {
                statusBadge.setText(getString("dashboard.status.invalid_response"));
                if (emailLabel != null) {
                    emailLabel.setText("");
                }
                return;
            }

            JsonObject json = JsonParser.parseString(response).getAsJsonObject();
            if (!json.has("status")) {
                statusBadge.setText(getString("dashboard.status.unknown"));
                if (emailLabel != null) {
                    emailLabel.setText("");
                }
                return;
            }

            String status = json.get("status").getAsString();
            // Try to translate status if possible, otherwise show as is
            String statusKey = "dashboard.status." + status.toLowerCase().replace(" ", "_");
            String localizedStatus = getString(statusKey);
            if (localizedStatus.equals(statusKey)) {
                // fallback if key not found
                localizedStatus = status;
            }
            statusBadge.setText(localizedStatus);

            String normalized = status.toLowerCase();
            if (normalized.contains("expired") ||
                    normalized.contains("inactive") ||
                    normalized.contains("no active")) {

                LocalStorage.deleteLicense();
                openActivation();
                return;
            }

            // Fill labels
            planLabel.setText(json.has("plan") ? json.get("plan").getAsString() : "");
            daysLabel.setText(json.has("daysRemaining") ? json.get("daysRemaining").getAsString() : "");
            if (emailLabel != null) {
                emailLabel.setText("Activation license");
            }

            if (json.has("expiresAt")) {
                try {
                    // Try parsing as OffsetDateTime first
                    java.time.OffsetDateTime odt = java.time.OffsetDateTime.parse(json.get("expiresAt").getAsString());
                    expiryLabel.setText(odt.toLocalDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));

                    if (!json.has("daysRemaining")) {
                        long days = java.time.Duration.between(java.time.OffsetDateTime.now(), odt).toDays();
                        daysLabel.setText(days < 0 ? "Expired" : days + " days");
                    }
                } catch (Exception ex) {
                    try {
                        // Fallback to LocalDateTime
                        LocalDateTime ldt = LocalDateTime.parse(json.get("expiresAt").getAsString());
                        expiryLabel.setText(ldt.format(DateTimeFormatter.ofPattern("dd MMM yyyy")));

                        if (!json.has("daysRemaining")) {
                            long days = java.time.Duration.between(LocalDateTime.now(), ldt).toDays();
                            daysLabel.setText(days < 0 ? "Expired" : days + " days");
                        }
                    } catch (Exception e2) {
                        expiryLabel.setText(json.get("expiresAt").getAsString());
                    }
                }
            } else {
                expiryLabel.setText("");
            }

            deviceIdLabel.setText(json.has("deviceId") ? json.get("deviceId").getAsString() : deviceId);

            // Features
            featuresBox.getChildren().clear();
            if (json.has("features") && json.get("features").isJsonArray()) {
                JsonArray arr = json.getAsJsonArray("features");

                for (int i = 0; i < arr.size(); i++) {
                    String featureCode = arr.get(i).getAsString();
                    String featureKey = "feature." + featureCode;
                    String localizedFeature = getString(featureKey);
                    // If translation missing, fallback to code
                    if (localizedFeature.equals(featureKey)) {
                        localizedFeature = featureCode;
                    }

                    Label tag = new Label(localizedFeature);
                    tag.setStyle(
                            "-fx-background-color:#1976D2; -fx-text-fill:white;" +
                                    " -fx-padding:5 10; -fx-background-radius:5;");
                    featuresBox.getChildren().add(tag);
                }
            }

        } catch (Exception e) {
            statusBadge.setText(getString("dashboard.status.failed_load"));
        }
    }

    private void fillFromAccountSession(LocalStorage.AccountSession session) {
        try {
            statusBadge.setText(getString("dashboard.status.signed_in"));
            planLabel.setText(session.plan() != null ? session.plan() : "");

            if (emailLabel != null) {
                emailLabel.setText(session.email() != null ? session.email() : "");
            }

            if (session.expiresAt() != null && !session.expiresAt().isBlank()) {
                try {
                    // Try parsing as OffsetDateTime first (standard ISO)
                    java.time.OffsetDateTime odt = java.time.OffsetDateTime.parse(session.expiresAt());
                    expiryLabel.setText(odt.toLocalDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
                    long days = java.time.Duration.between(java.time.OffsetDateTime.now(), odt).toDays();
                    daysLabel.setText(days < 0 ? "Expired" : days + " days");
                } catch (Exception e1) {
                    try {
                        // Fallback to LocalDateTime (no offset)
                        LocalDateTime ldt = LocalDateTime.parse(session.expiresAt());
                        expiryLabel.setText(ldt.format(DateTimeFormatter.ofPattern("dd MMM yyyy")));
                        long days = java.time.Duration.between(LocalDateTime.now(), ldt).toDays();
                        daysLabel.setText(days < 0 ? "Expired" : days + " days");
                    } catch (Exception e2) {
                        expiryLabel.setText(session.expiresAt());
                        daysLabel.setText("-");
                    }
                }
            } else {
                expiryLabel.setText("-");
                daysLabel.setText("-");
            }

            deviceIdLabel.setText(LocalStorage.loadDeviceId());
            featuresBox.getChildren().clear();

            if (session.features() != null && !session.features().isEmpty()) {
                for (String feature : session.features()) {
                    String featureKey = "feature." + feature;
                    String localizedFeature = getString(featureKey);
                    if (localizedFeature.equals(featureKey)) {
                        localizedFeature = feature;
                    }
                    Label tag = new Label(localizedFeature);
                    tag.setStyle(
                            "-fx-background-color:#1976D2; -fx-text-fill:white; -fx-padding:5 10; -fx-background-radius:5;");
                    featuresBox.getChildren().add(tag);
                }
            } else {
                // Fallback if no features found
                Label tag = new Label(
                        session.email() != null ? session.email() : getString("dashboard.status.signed_in"));
                tag.setStyle(
                        "-fx-background-color:#1976D2; -fx-text-fill:white; -fx-padding:5 10; -fx-background-radius:5;");
                featuresBox.getChildren().add(tag);
            }

        } catch (Exception e) {
            statusBadge.setText(getString("dashboard.status.unable_load"));
        }
    }

    @FXML
    public void onSignOut() {
        // Check if user is logged in with activation code or email
        LocalStorage.AccountSession session = LocalStorage.loadAccountSession();
        String savedKey = LocalStorage.loadLicense();

        // If email session, sign out immediately without confirmation
        if (session != null) {
            LocalStorage.clearAccountSession();
            // Navigate to Login screen
            try {
                Stage stage = (Stage) statusBadge.getScene().getWindow();
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/Login.fxml"), resources);
                Pane root = loader.load();
                stage.getScene().setRoot(root);
            } catch (Exception e) {
                e.printStackTrace();
            }
            return;
        }

        // If activation code session, show confirmation dialog
        if (savedKey != null && !savedKey.isEmpty()) {
            javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
                    javafx.scene.control.Alert.AlertType.CONFIRMATION);
            alert.setTitle(getString("dashboard.signout.title"));
            alert.setHeaderText(null);
            alert.setContentText(getString("dashboard.signout.message"));

            // Customize button text
            javafx.scene.control.ButtonType confirmButton = new javafx.scene.control.ButtonType(
                    getString("dashboard.signout.confirm"));
            javafx.scene.control.ButtonType cancelButton = new javafx.scene.control.ButtonType(
                    getString("dashboard.signout.cancel"), javafx.scene.control.ButtonBar.ButtonData.CANCEL_CLOSE);
            alert.getButtonTypes().setAll(confirmButton, cancelButton);

            java.util.Optional<javafx.scene.control.ButtonType> result = alert.showAndWait();
            if (result.isPresent() && result.get() == confirmButton) {
                LocalStorage.deleteLicense();
                openActivation();
            }
        } else {
            // Fallback if neither (shouldn't happen if authenticated)
            openActivation();
        }
    }
}
