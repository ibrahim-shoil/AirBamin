package com.airbamin.desktop.ui;

import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.ContextMenu;
import javafx.scene.control.Label;
import javafx.scene.control.MenuItem;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.HBox;
import javafx.stage.Stage;

public class TitleBarController {

    @FXML
    private HBox titleBar;

    @FXML
    private Label windowTitle;

    @FXML
    private Button closeBtn;

    @FXML
    private Button minimizeBtn;

    @FXML
    private Button maximizeBtn;

    private double xOffset = 0;
    private double yOffset = 0;

    // Store original window bounds for restore
    private double originalX = 0;
    private double originalY = 0;
    private double originalWidth = 900;
    private double originalHeight = 650;
    private boolean isManuallyMaximized = false;

    @FXML
    public void initialize() {
        // Set up button click handlers programmatically for macOS compatibility
        if (closeBtn != null) {
            closeBtn.setOnMouseClicked(event -> {
                event.consume();
                Stage stage = (Stage) titleBar.getScene().getWindow();
                stage.close();
                System.exit(0);
            });
        }

        if (minimizeBtn != null) {
            minimizeBtn.setOnMouseClicked(event -> {
                event.consume();
                Stage stage = (Stage) titleBar.getScene().getWindow();
                stage.setIconified(true);
            });
        }

        if (maximizeBtn != null) {
            maximizeBtn.setOnMouseClicked(event -> {
                event.consume();
                handleMaximize();
            });

            // Add context menu for window options (right-click)
            ContextMenu contextMenu = new ContextMenu();

            MenuItem fullscreenItem = new MenuItem("Enter Full Screen");
            fullscreenItem.setOnAction(e -> enterFullScreen());

            MenuItem tileLeftItem = new MenuItem("Tile Window to Left of Screen");
            tileLeftItem.setOnAction(e -> tileWindowLeft());

            MenuItem tileRightItem = new MenuItem("Tile Window to Right of Screen");
            tileRightItem.setOnAction(e -> tileWindowRight());

            contextMenu.getItems().addAll(fullscreenItem, tileLeftItem, tileRightItem);
            maximizeBtn.setContextMenu(contextMenu);
        }

        System.out.println("TitleBarController initialized. Buttons: close=" + closeBtn + ", minimize=" + minimizeBtn
                + ", maximize=" + maximizeBtn);
    }

    private void handleMaximize() {
        Stage stage = (Stage) titleBar.getScene().getWindow();

        if (isManuallyMaximized) {
            stage.setX(originalX);
            stage.setY(originalY);
            stage.setWidth(originalWidth);
            stage.setHeight(originalHeight);
            isManuallyMaximized = false;
        } else {
            originalX = stage.getX();
            originalY = stage.getY();
            originalWidth = stage.getWidth();
            originalHeight = stage.getHeight();

            javafx.geometry.Rectangle2D bounds = javafx.stage.Screen.getPrimary().getVisualBounds();
            stage.setX(bounds.getMinX());
            stage.setY(bounds.getMinY());
            stage.setWidth(bounds.getWidth());
            stage.setHeight(bounds.getHeight());
            isManuallyMaximized = true;
        }
    }

    private void enterFullScreen() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.setFullScreen(!stage.isFullScreen());
    }

    private void tileWindowLeft() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        javafx.geometry.Rectangle2D bounds = javafx.stage.Screen.getPrimary().getVisualBounds();
        stage.setX(bounds.getMinX());
        stage.setY(bounds.getMinY());
        stage.setWidth(bounds.getWidth() / 2);
        stage.setHeight(bounds.getHeight());
        isManuallyMaximized = false;
    }

    private void tileWindowRight() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        javafx.geometry.Rectangle2D bounds = javafx.stage.Screen.getPrimary().getVisualBounds();
        stage.setX(bounds.getMinX() + bounds.getWidth() / 2);
        stage.setY(bounds.getMinY());
        stage.setWidth(bounds.getWidth() / 2);
        stage.setHeight(bounds.getHeight());
        isManuallyMaximized = false;
    }

    @FXML
    private void onMousePressed(MouseEvent event) {
        xOffset = event.getSceneX();
        yOffset = event.getSceneY();
    }

    @FXML
    private void onMouseDragged(MouseEvent event) {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        // If maximized, restore first when dragging
        if (isManuallyMaximized) {
            isManuallyMaximized = false;
            stage.setWidth(originalWidth);
            stage.setHeight(originalHeight);
        }
        stage.setX(event.getScreenX() - xOffset);
        stage.setY(event.getScreenY() - yOffset);
    }

    // MouseEvent handlers for macOS compatibility (onAction doesn't work reliably
    // on undecorated stages)
    @FXML
    private void onCloseClick(MouseEvent event) {
        event.consume(); // Prevent event from propagating
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.close();
        System.exit(0);
    }

    @FXML
    private void onMinimizeClick(MouseEvent event) {
        event.consume();
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.setIconified(true);
    }

    @FXML
    private void onMaximizeClick(MouseEvent event) {
        event.consume();
        Stage stage = (Stage) titleBar.getScene().getWindow();

        if (isManuallyMaximized) {
            // Restore to original size and position
            stage.setX(originalX);
            stage.setY(originalY);
            stage.setWidth(originalWidth);
            stage.setHeight(originalHeight);
            isManuallyMaximized = false;
        } else {
            // Save current bounds before maximizing
            originalX = stage.getX();
            originalY = stage.getY();
            originalWidth = stage.getWidth();
            originalHeight = stage.getHeight();

            // Get the visual bounds (screen minus dock/menubar)
            javafx.geometry.Rectangle2D bounds = javafx.stage.Screen.getPrimary().getVisualBounds();
            stage.setX(bounds.getMinX());
            stage.setY(bounds.getMinY());
            stage.setWidth(bounds.getWidth());
            stage.setHeight(bounds.getHeight());
            isManuallyMaximized = true;
        }
    }

    @FXML
    private void onMinimize() {
        Stage stage = (Stage) titleBar.getScene().getWindow();
        stage.setIconified(true);
    }

    @FXML
    private void onMaximize() {
        Stage stage = (Stage) titleBar.getScene().getWindow();

        if (isManuallyMaximized) {
            // Restore to original size and position
            stage.setX(originalX);
            stage.setY(originalY);
            stage.setWidth(originalWidth);
            stage.setHeight(originalHeight);
            isManuallyMaximized = false;
        } else {
            // Save current bounds before maximizing
            originalX = stage.getX();
            originalY = stage.getY();
            originalWidth = stage.getWidth();
            originalHeight = stage.getHeight();

            // Get the visual bounds (screen minus dock/menubar)
            javafx.geometry.Rectangle2D bounds = javafx.stage.Screen.getPrimary().getVisualBounds();
            stage.setX(bounds.getMinX());
            stage.setY(bounds.getMinY());
            stage.setWidth(bounds.getWidth());
            stage.setHeight(bounds.getHeight());
            isManuallyMaximized = true;
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
