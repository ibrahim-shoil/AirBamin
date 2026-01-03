package com.airbamin.desktop.ui;

import com.airbamin.desktop.storage.LocalStorage;
import com.airbamin.desktop.transfer.LocalTransferServer;
import com.airbamin.desktop.transfer.TransferService;
import com.airbamin.desktop.utils.AuthManager;
import com.airbamin.desktop.utils.WindowsNotification;
import javafx.animation.PauseTransition;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Hyperlink;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressBar;
import javafx.scene.image.ImageView;
import javafx.scene.shape.SVGPath;
import javafx.util.Duration;
import java.awt.Desktop;
import java.awt.Toolkit;
import java.io.IOException;
import java.text.MessageFormat;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.concurrent.atomic.AtomicReference;

public class TransferController {

    @FXML
    private javafx.scene.layout.BorderPane rootPane;
    @FXML
    private ImageView qrImageView;
    @FXML
    private Hyperlink connectionLink;
    @FXML
    private Label connectionStatusLabel;
    @FXML
    private Label uploadDirLabel;
    @FXML
    private ProgressBar progressBar;
    @FXML
    private Label statusLabel;

    private final LocalTransferServer localServer = LocalTransferServer.getInstance();
    private final TransferService transferService = localServer.getTransferService();
    private final com.google.zxing.qrcode.QRCodeWriter qrWriter = new com.google.zxing.qrcode.QRCodeWriter();
    private final AtomicReference<String> pendingStatus = new AtomicReference<>();
    private final PauseTransition resetTimer = new PauseTransition(Duration.seconds(1.5));
    private ResourceBundle bundle;

    private final LocalTransferServer.ServerListener serverListener = new LocalTransferServer.ServerListener() {
        @Override
        public void onClientConnected(String remoteIp) {
            updateConnectionLabel(MessageFormat.format(bundle.getString("transfer.status.connected"), remoteIp));
            setStatusMessage(MessageFormat.format(bundle.getString("transfer.status.connected"), remoteIp));
        }

        @Override
        public void onUploadStarted(String filename, String remoteIp) {
            resetTimer.stop();
            updatePhoneProgress(0, MessageFormat.format(bundle.getString("transfer.status.uploading"), filename));
            setStatusStyle("status-note");
        }

        @Override
        public void onUploadProgress(String filename, String remoteIp, double percent) {
            updatePhoneProgress(percent / 100.0, MessageFormat.format(bundle.getString("transfer.status.progress"),
                    filename, String.format("%.0f", percent)));
        }

        @Override
        public void onUploadCompleted(com.airbamin.desktop.transfer.TransferService.FileRecord record,
                String remoteIp) {
            updatePhoneProgress(1.0, MessageFormat.format(bundle.getString("transfer.status.complete"), record.name()));
            setStatusStyle("status-success");
            resetTimer.playFromStart();
        }

        @Override
        public void onBatchCompleted(String batchId, String remoteIp) {
            Platform.runLater(() -> {
                Toolkit.getDefaultToolkit().beep();
                WindowsNotification.show("AirBamin", "Uploads finished from " + remoteIp);
                setStatusStyle("status-success");
                resetTimer.playFromStart();
            });
        }

        @Override
        public void onClientDisconnected() {
            updateConnectionLabel(bundle.getString("transfer.status.waiting"));
            setStatusMessage(bundle.getString("transfer.status.waiting"));
        }
    };

    @FXML
    public void initialize() {
        if (!AuthManager.ensureAuthenticated(rootPane)) {
            return;
        }

        // Load ResourceBundle
        String lang = LocalStorage.loadLanguage();
        if (lang == null || lang.isBlank()) {
            lang = "en";
        }
        Locale locale = lang.equals("ar") ? new Locale("ar") : Locale.ENGLISH;
        bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

        uploadDirLabel.setText(transferService.getUploadDir().toAbsolutePath().toString());
        updateConnectionLabel(bundle.getString("transfer.status.waiting"));
        setStatusMessage(bundle.getString("transfer.status.waiting"));

        localServer.addListener(serverListener);

        // Ensure server is running and generate QR
        boolean started = localServer.start();
        if (started) {
            refreshLink();
        } else {
            updateConnectionLabel("Server error: ports in use");
        }

        String lastIp = localServer.getLastConnectedIp();
        if (lastIp != null) {
            updateConnectionLabel(MessageFormat.format(bundle.getString("transfer.status.connected"), lastIp));
            setStatusMessage(MessageFormat.format(bundle.getString("transfer.status.connected"), lastIp));
        }

        resetTimer.setOnFinished(event -> resetToIdle());

        if (rootPane != null) {
            rootPane.sceneProperty().addListener((obs, oldScene, newScene) -> {
                if (newScene == null) {
                    localServer.removeListener(serverListener);
                }
            });
        }

        if (connectionLink != null) {
            connectionLink.setOnAction(e -> {
                String url = connectionLink.getText();
                if (url != null && !url.isBlank()) {
                    try {
                        Desktop.getDesktop().browse(java.net.URI.create(url));
                    } catch (Exception ignored) {
                    }
                }
            });
        }
    }

    private void refreshLink() {
        int port = localServer.getActivePort();
        String url = transferService.buildPhoneUrl(com.airbamin.desktop.network.NetworkUtils.NetworkMode.AUTO, "",
                port);
        if (connectionLink != null) {
            connectionLink.setText(url);
        }
        generateQr(url + "/");
    }

    private void generateQr(String text) {
        if (qrImageView == null)
            return;
        try {
            var matrix = qrWriter.encode(text, com.google.zxing.BarcodeFormat.QR_CODE, 200, 200);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            javafx.scene.image.Image image = new javafx.scene.image.Image(
                    new java.io.ByteArrayInputStream(out.toByteArray()));
            qrImageView.setImage(image);
        } catch (Exception e) {
            // ignore
        }
    }

    @FXML
    public void onOpenFolder() {
        try {
            Desktop.getDesktop().open(transferService.getUploadDir().toFile());
        } catch (IOException e) {
            setStatusMessage("Cannot open folder: " + e.getMessage());
        }
    }

    private void resetToIdle() {
        if (Platform.isFxApplicationThread()) {
            progressBar.setProgress(0);
            statusLabel.setText(bundle.getString("transfer.status.waiting"));
            setStatusStyle("status-note");
        } else {
            Platform.runLater(() -> {
                progressBar.setProgress(0);
                statusLabel.setText(bundle.getString("transfer.status.waiting"));
                setStatusStyle("status-note");
            });
        }
    }

    private void setStatusMessage(String message) {
        if (statusLabel == null) {
            return;
        }

        Runnable action = () -> {
            if (statusLabel.textProperty().isBound()) {
                pendingStatus.set(message);
            } else {
                statusLabel.setText(message);
            }
        };

        if (Platform.isFxApplicationThread()) {
            action.run();
        } else {
            Platform.runLater(action);
        }
    }

    private void setStatusStyle(String styleClass) {
        if (statusLabel == null)
            return;
        Platform.runLater(() -> {
            statusLabel.getStyleClass().removeAll("status-success", "status-warning", "status-note");
            if (styleClass != null && !styleClass.isBlank()) {
                if (!statusLabel.getStyleClass().contains(styleClass)) {
                    statusLabel.getStyleClass().add(styleClass);
                }
            }
        });
    }

    private void updateConnectionLabel(String message) {
        if (connectionStatusLabel == null) {
            return;
        }
        if (Platform.isFxApplicationThread()) {
            connectionStatusLabel.setText(message);
        } else {
            Platform.runLater(() -> connectionStatusLabel.setText(message));
        }
    }

    private void updatePhoneProgress(double progress, String message) {
        if (Platform.isFxApplicationThread()) {
            progressBar.setProgress(progress);
            statusLabel.setText(message);
        } else {
            Platform.runLater(() -> {
                progressBar.setProgress(progress);
                statusLabel.setText(message);
            });
        }
    }
}
