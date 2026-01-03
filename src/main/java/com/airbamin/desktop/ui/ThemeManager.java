package com.airbamin.desktop.ui;

import javafx.scene.Scene;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class ThemeManager {

    public static final String THEME_LIGHT = "light";
    public static final String THEME_DARK = "dark";
    public static final String THEME_SYSTEM = "system";

    public static void applyTheme(Scene scene, String mode) {
        if (scene == null)
            return;

        scene.getStylesheets().clear();
        scene.getStylesheets().add(ThemeManager.class.getResource("/css/app-theme.css").toExternalForm());

        boolean isDark = false;

        if (THEME_DARK.equalsIgnoreCase(mode)) {
            isDark = true;
        } else if (THEME_LIGHT.equalsIgnoreCase(mode)) {
            isDark = false;
        } else {
            // System
            isDark = isSystemDark();
        }

        if (isDark) {
            // Dark is default in app-theme.css, but we might want a specific dark override
            // if needed.
            // For now, app-theme.css IS the dark theme.
            if (!scene.getRoot().getStyleClass().contains("dark-mode")) {
                scene.getRoot().getStyleClass().add("dark-mode");
            }
        } else {
            scene.getStylesheets().add(ThemeManager.class.getResource("/themes/light.css").toExternalForm());
            scene.getRoot().getStyleClass().remove("dark-mode");
        }
    }

    public static boolean isSystemDark() {
        try {
            String os = System.getProperty("os.name").toLowerCase();

            // macOS Dark Mode Check
            if (os.contains("mac")) {
                ProcessBuilder builder = new ProcessBuilder(
                        "defaults", "read", "-g", "AppleInterfaceStyle");
                Process process = builder.start();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line = reader.readLine();
                    if (line != null && line.trim().equalsIgnoreCase("Dark")) {
                        return true;
                    }
                }
                // If command fails or returns nothing, it means Light mode
                return false;
            }

            // Windows Registry Check
            if (os.contains("win")) {
                ProcessBuilder builder = new ProcessBuilder(
                        "reg", "query",
                        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", "/v",
                        "AppsUseLightTheme");
                Process process = builder.start();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.contains("AppsUseLightTheme")) {
                            // 0x0 = Dark, 0x1 = Light
                            return line.contains("0x0");
                        }
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return false; // Default to light if unknown
    }

    public static void applyToDialog(javafx.scene.control.Dialog<?> dialog, String mode) {
        if (dialog == null || dialog.getDialogPane() == null)
            return;

        javafx.scene.Scene scene = dialog.getDialogPane().getScene();
        if (scene != null) {
            applyTheme(scene, mode);
            // Ensure dialog pane itself has correct background
            if (THEME_DARK.equalsIgnoreCase(mode) || (THEME_SYSTEM.equalsIgnoreCase(mode) && isSystemDark())) {
                dialog.getDialogPane().getStyleClass().add("dark-mode");
            }
        }
    }
}
