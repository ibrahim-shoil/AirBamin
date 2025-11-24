package com.airbamin.desktop.ui;

import javafx.fxml.FXML;
import javafx.scene.layout.HBox;

public class AppHeaderController {

    @FXML private HBox headerBar;

    @FXML
    private void onNavigateHome() {
        Navigation.navigate(headerBar, "/Home.fxml");
    }

    @FXML
    private void onNavigateDashboard() {
        Navigation.navigate(headerBar, "/Dashboard.fxml");
    }

    @FXML
    private void onNavigateTransfer() {
        Navigation.navigate(headerBar, "/Transfer.fxml");
    }

    @FXML
    private void onNavigateFiles() {
        Navigation.navigate(headerBar, "/Uploads.fxml");
    }

    @FXML
    private void onNavigateSettings() {
        Navigation.navigate(headerBar, "/Settings.fxml");
    }

    @FXML
    private void onNavigateHelp() {
        Navigation.navigate(headerBar, "/Help.fxml");
    }
}
