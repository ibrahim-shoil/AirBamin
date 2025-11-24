package com.airbamin.desktop.ui;

import com.airbamin.desktop.storage.LocalStorage;
import javafx.fxml.FXMLLoader;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.stage.Stage;

import java.io.IOException;
import java.util.Locale;
import java.util.ResourceBundle;

/**
 * Small helper to switch scenes from any control without repeating boilerplate.
 */
public final class Navigation {

    private Navigation() {
    }

    public static void navigate(Node sourceNode, String fxmlPath) {
        if (sourceNode == null || sourceNode.getScene() == null) {
            return;
        }

        try {
            Stage stage = (Stage) sourceNode.getScene().getWindow();

            String lang = LocalStorage.loadLanguage();
            if (lang == null || lang.isBlank())
                lang = "en";
            Locale locale = Locale.of(lang);
            ResourceBundle bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

            FXMLLoader loader = new FXMLLoader(Navigation.class.getResource(fxmlPath), bundle);
            Parent root = loader.load();
            stage.getScene().setRoot(root);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
