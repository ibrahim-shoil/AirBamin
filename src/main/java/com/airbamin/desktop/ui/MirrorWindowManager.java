package com.airbamin.desktop.ui;

import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class MirrorWindowManager {

    private static Stage mirrorStage;
    private static MirrorDisplayController controller;

    public static void show() {
        Platform.runLater(() -> {
            try {
                // If window is already open, just bring it to front
                if (mirrorStage != null && mirrorStage.isShowing()) {
                    mirrorStage.toFront();
                    return;
                }

                System.out.println("[Mirror] Opening mirror window...");
                FXMLLoader loader = new FXMLLoader(MirrorWindowManager.class.getResource("/MirrorDisplay.fxml"));

                if (loader.getLocation() == null) {
                    System.err.println("[Mirror] ERROR: MirrorDisplay.fxml not found!");
                    return;
                }

                Parent root = loader.load();
                controller = loader.getController();

                Scene scene = new Scene(root);
                mirrorStage = new Stage();
                mirrorStage.setTitle("AirBamin Mirror");
                mirrorStage.setScene(scene);

                // Ensure resources are freed when window is closed
                mirrorStage.setOnCloseRequest(event -> {
                    if (controller != null) {
                        controller.stopMirroring();
                    }
                    mirrorStage = null;
                    controller = null;
                });

                mirrorStage.show();
                System.out.println("[Mirror] Mirror window opened successfully!");

            } catch (Exception e) {
                System.err.println("[Mirror] ERROR opening mirror window:");
                e.printStackTrace();
            }
        });
    }
}
