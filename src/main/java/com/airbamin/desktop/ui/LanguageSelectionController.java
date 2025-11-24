package com.airbamin.desktop.ui;

import com.airbamin.desktop.Main;
import com.airbamin.desktop.storage.LocalStorage;
import javafx.fxml.FXML;
import javafx.stage.Stage;

public class LanguageSelectionController {

    @FXML
    public void onEnglishSelected() {
        selectLanguage("en");
    }

    @FXML
    public void onArabicSelected() {
        selectLanguage("ar");
    }

    private void selectLanguage(String lang) {
        LocalStorage.saveLanguage(lang);

        // Restart or proceed to main app
        try {
            // Get current stage
            Stage stage = (Stage) Stage.getWindows().stream().filter(javafx.stage.Window::isShowing).findFirst()
                    .orElse(null);
            if (stage != null) {
                new Main().start(stage);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
