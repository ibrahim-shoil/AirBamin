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

    // Cache views to keep state (background downloads, inputs etc.)
    private static final java.util.Map<String, Parent> viewCache = new java.util.HashMap<>();

    private Navigation() {
    }

    public static void clearCache() {
        viewCache.clear();
    }

    public static void navigate(Node sourceNode, String fxmlPath) {
        if (sourceNode == null || sourceNode.getScene() == null) {
            return;
        }

        try {
            Stage stage = (Stage) sourceNode.getScene().getWindow();
            Parent content;

            if (viewCache.containsKey(fxmlPath)) {
                content = viewCache.get(fxmlPath);
            } else {
                String lang = LocalStorage.loadLanguage();
                if (lang == null || lang.isBlank())
                    lang = "en";
                Locale locale = new Locale(lang);
                ResourceBundle bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

                FXMLLoader loader = new FXMLLoader(Navigation.class.getResource(fxmlPath), bundle);
                content = loader.load();

                // Store controller for reuse in navigateWithData if needed
                Object controller = loader.getController();
                if (controller != null) {
                    content.getProperties().put("controller", controller);
                }

                viewCache.put(fxmlPath, content);
            }

            Parent currentRoot = stage.getScene().getRoot();
            if (currentRoot instanceof javafx.scene.layout.BorderPane) {
                ((javafx.scene.layout.BorderPane) currentRoot).setCenter(content);
            } else {
                // Fallback: Wrap in BorderPane with TitleBar if not already
                javafx.scene.layout.BorderPane mainLayout = new javafx.scene.layout.BorderPane();

                // For the title bar, we don't necessarily cache it as it's part of the root
                // structure usually
                String lang = LocalStorage.loadLanguage();
                if (lang == null || lang.isBlank())
                    lang = "en";
                Locale locale = new Locale(lang);
                ResourceBundle bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

                FXMLLoader titleLoader = new FXMLLoader(Navigation.class.getResource("/components/TitleBar.fxml"));
                javafx.scene.Node titleBarNode = titleLoader.load();
                com.airbamin.desktop.ui.TitleBarController titleController = titleLoader.getController();
                titleController.setTitle(bundle.getString("app.title"));

                mainLayout.setTop(titleBarNode);
                mainLayout.setCenter(content);
                stage.getScene().setRoot(mainLayout);

                // Re-apply resize listener as root changed
                com.airbamin.desktop.ui.ResizeHelper.addResizeListener(stage);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * Navigate to a new screen and pass data to the controller.
     */
    public static void navigateWithData(Node sourceNode, String fxmlPath, String data) {
        if (sourceNode == null || sourceNode.getScene() == null) {
            return;
        }

        try {
            Stage stage = (Stage) sourceNode.getScene().getWindow();
            Parent content;
            Object controller = null;

            if (viewCache.containsKey(fxmlPath)) {
                content = viewCache.get(fxmlPath);
                controller = content.getProperties().get("controller");
            } else {
                String lang = LocalStorage.loadLanguage();
                if (lang == null || lang.isBlank())
                    lang = "en";
                Locale locale = new Locale(lang);
                ResourceBundle bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

                FXMLLoader loader = new FXMLLoader(Navigation.class.getResource(fxmlPath), bundle);
                content = loader.load();
                controller = loader.getController();

                if (controller != null) {
                    content.getProperties().put("controller", controller);
                }
                viewCache.put(fxmlPath, content);
            }

            // Pass data to controller if it has setData method
            if (controller != null) {
                try {
                    java.lang.reflect.Method setDataMethod = controller.getClass().getMethod("setData", String.class);
                    setDataMethod.invoke(controller, data);
                } catch (NoSuchMethodException ignored) {
                    // Controller doesn't have setData method, ignore
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            Parent currentRoot = stage.getScene().getRoot();
            if (currentRoot instanceof javafx.scene.layout.BorderPane) {
                ((javafx.scene.layout.BorderPane) currentRoot).setCenter(content);
            } else {
                javafx.scene.layout.BorderPane mainLayout = new javafx.scene.layout.BorderPane();

                String lang = LocalStorage.loadLanguage();
                if (lang == null || lang.isBlank())
                    lang = "en";
                Locale locale = new Locale(lang);
                ResourceBundle bundle = ResourceBundle.getBundle("com.airbamin.desktop.messages_" + lang, locale);

                FXMLLoader titleLoader = new FXMLLoader(Navigation.class.getResource("/components/TitleBar.fxml"));
                javafx.scene.Node titleBarNode = titleLoader.load();
                com.airbamin.desktop.ui.TitleBarController titleController = titleLoader.getController();
                titleController.setTitle(bundle.getString("app.title"));

                mainLayout.setTop(titleBarNode);
                mainLayout.setCenter(content);
                stage.getScene().setRoot(mainLayout);

                com.airbamin.desktop.ui.ResizeHelper.addResizeListener(stage);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
