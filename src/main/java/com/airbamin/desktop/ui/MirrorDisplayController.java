package com.airbamin.desktop.ui;

import com.airbamin.desktop.mirror.MirrorReceiver;
import com.airbamin.desktop.mirror.VideoDecoder;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.image.ImageView;
import javafx.scene.layout.AnchorPane;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;

public class MirrorDisplayController {

    @FXML
    private StackPane rootPane;

    @FXML
    private ImageView displayView;

    @FXML
    private AnchorPane overlayPane;

    @FXML
    private Label statsLabel;

    private MirrorReceiver receiver;
    private VideoDecoder decoder;

    @FXML
    public void initialize() {
        // Initialize decoder and receiver
        decoder = new VideoDecoder(displayView);
        receiver = new MirrorReceiver();

        // Start receiving and decoding
        // Start receiving and decoding
        decoder.start();
        try {
            receiver.start(decoder);
        } catch (java.io.IOException e) {
            e.printStackTrace();
            System.err.println("Failed to start MirrorReceiver: " + e.getMessage());
            // Ideally show an alert to the user here
        }

        // Auto-hide overlay after 3 seconds
        overlayPane.setOpacity(1.0);
        new java.util.Timer().schedule(new java.util.TimerTask() {
            @Override
            public void run() {
                javafx.application.Platform.runLater(() -> {
                    overlayPane.setOpacity(0.0);
                });
            }
        }, 3000);

        // Show overlay on mouse move
        rootPane.setOnMouseMoved(event -> {
            overlayPane.setOpacity(1.0);
        });
    }

    @FXML
    private void handleClose() {
        stopMirroring();
        Stage stage = (Stage) rootPane.getScene().getWindow();
        stage.close();
    }

    public void stopMirroring() {
        if (receiver != null) {
            receiver.stop();
        }
        if (decoder != null) {
            decoder.stop();
        }
    }
}
