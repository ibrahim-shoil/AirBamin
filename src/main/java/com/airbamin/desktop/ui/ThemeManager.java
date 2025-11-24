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
        // Windows Registry Check
        try {
            String os = System.getProperty("os.name").toLowerCase();
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
}
