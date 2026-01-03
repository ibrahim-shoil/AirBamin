package com.airbamin.desktop.ui;

import com.airbamin.desktop.transfer.LocalTransferServer;
import com.airbamin.desktop.utils.AuthManager;
import com.airbamin.desktop.utils.UpdateNotifier;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.layout.BorderPane;

public class HomeController {

    @FXML
    private BorderPane rootPane;
    @FXML
    private Label messageLabel;

    private final LocalTransferServer localServer = LocalTransferServer.getInstance();

    @FXML
    public void initialize() {
        Platform.runLater(() -> {
            if (!AuthManager.ensureAuthenticated(rootPane)) {
                return;
            }

            UpdateNotifier.checkForUpdates(rootPane, false);
            boolean started = localServer.start();
            if (!started && messageLabel != null) {
                messageLabel.setText("Server error: transfer link unavailable (all ports in use)");
            }
        });
    }

    @FXML
    public void openTransferCenter() {
        loadScene("/Transfer.fxml");
    }

    @FXML
    public void openUploadsList() {
        loadScene("/Uploads.fxml");
    }

    @FXML
    public void onSelectFiles() {
        javafx.stage.FileChooser fileChooser = new javafx.stage.FileChooser();
        fileChooser.setTitle("Select Files to Send");
        java.util.List<java.io.File> files = fileChooser.showOpenMultipleDialog(rootPane.getScene().getWindow());

        if (files != null && !files.isEmpty()) {
            LocalTransferServer.getInstance().hostFiles(files);
            // Show success message instead of navigating
            if (messageLabel != null) {
                messageLabel.setText(files.size() + " files hosted. Mobile app can now download them.");
                messageLabel.setOpacity(1.0);
            }
        }
    }

    @FXML
    public void openDashboard() {
        loadScene("/Dashboard.fxml");
    }

    @FXML
    public void openSettings() {
        loadScene("/Settings.fxml");
    }

    @FXML
    public void openMirrorScreen() {
        MirrorWindowManager.show();
    }

    @FXML
    public void openYouTubeDownloader() {
        loadScene("/YouTubeDownloader.fxml");
    }

    private void loadScene(String resource) {
        try {
            Navigation.navigate(rootPane, resource);
        } catch (Exception e) {
            if (messageLabel != null) {
                messageLabel.setText("Cannot open view.");
            }
        }
    }
}
