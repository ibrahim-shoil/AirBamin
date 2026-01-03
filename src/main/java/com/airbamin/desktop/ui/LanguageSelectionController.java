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

        // Restart with a new stage (macOS requires new stage for style changes)
        try {
            // Get current stage and close it
            Stage oldStage = (Stage) Stage.getWindows().stream().filter(javafx.stage.Window::isShowing).findFirst()
                    .orElse(null);
            
            // Create a new stage
            Stage newStage = new Stage();
            new Main().start(newStage);
            
            // Close the old stage after the new one is shown
            if (oldStage != null) {
                oldStage.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
