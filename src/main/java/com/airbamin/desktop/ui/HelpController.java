package com.airbamin.desktop.ui;

import com.airbamin.desktop.AppVersion;
import javafx.fxml.FXML;
import javafx.scene.control.Label;

public class HelpController {

    @FXML
    private Label versionLabel;

    @FXML
    public void initialize() {
        if (versionLabel != null) {
            versionLabel.setText("Version: " + AppVersion.VERSION);
        }
    }
}
