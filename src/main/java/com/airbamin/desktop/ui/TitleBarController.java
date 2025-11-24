package com.airbamin.desktop.ui;

import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.HBox;
import javafx.stage.Stage;

public class TitleBarController {

    @FXML
    private HBox titleBar;

    @FXML
    private Label windowTitle;

    private double xOffset = 0;
    private double yOffset = 0;

    @FXML
    private void onMousePressed(MouseEvent event) {
        xOffset = event.getSceneX();
        yOffset = event.getSceneY();
    }

    @FXML
    private void onMouseDragged(MouseEvent event) {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.setX(event.getScreenX() - xOffset);
        stage.setY(event.getScreenY() - yOffset);
    }

    @FXML
    private void onMinimize() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.setIconified(true);
    }

    @FXML
    private void onMaximize() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        if (stage.isMaximized()) {
            stage.setMaximized(false);
        } else {
            stage.setMaximized(true);
        }
    }

    @FXML
    private void onClose() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.close();
        System.exit(0);
    }

    public void setTitle(String title) {
        if (windowTitle != null) {
            windowTitle.setText(title);
        }
    }
}
