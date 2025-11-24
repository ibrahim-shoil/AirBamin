package com.airbamin.desktop.system;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class WindowsThemeDetector {

    /**
     * Returns true if Windows is using DARK mode.
     * Returns false if Windows is using LIGHT mode or unknown.
     */
    public static boolean isWindowsDarkTheme() {
        try {
            Process process = Runtime.getRuntime().exec(
                    "reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize /v AppsUseLightTheme"
            );

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
            );

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("AppsUseLightTheme")) {

                    // Example output:
                    //    AppsUseLightTheme    REG_DWORD    0x0
                    boolean lightTheme = line.trim().endsWith("0x1");
                    return !lightTheme;  // 0 = dark , 1 = light
                }
            }
        } catch (Exception ignored) {}

        return false; // default to dark = false (light)
    }
}
