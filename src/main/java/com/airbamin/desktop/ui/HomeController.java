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
    @FXML
    private javafx.scene.image.ImageView qrImage;
    @FXML
    private Label ipLabel;

    private final LocalTransferServer localServer = LocalTransferServer.getInstance();
    private final com.airbamin.desktop.transfer.TransferService transferService = localServer.getTransferService();
    private final com.google.zxing.qrcode.QRCodeWriter qrWriter = new com.google.zxing.qrcode.QRCodeWriter();

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
            } else {
                refreshLink();
            }
        });
    }

    private void refreshLink() {
        int port = localServer.getActivePort();
        String url = transferService.buildPhoneUrl(com.airbamin.desktop.network.NetworkUtils.NetworkMode.AUTO, "",
                port);
        if (ipLabel != null) {
            ipLabel.setText(url);
        }
        generateQr(url + "/");
    }

    private void generateQr(String text) {
        if (qrImage == null)
            return;
        try {
            var matrix = qrWriter.encode(text, com.google.zxing.BarcodeFormat.QR_CODE, 200, 200);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            javafx.scene.image.Image image = new javafx.scene.image.Image(
                    new java.io.ByteArrayInputStream(out.toByteArray()));
            qrImage.setImage(image);
        } catch (Exception e) {
            if (messageLabel != null)
                messageLabel.setText("QR error: " + e.getMessage());
        }
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
