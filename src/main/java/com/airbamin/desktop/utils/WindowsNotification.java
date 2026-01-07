package com.airbamin.desktop.utils;

import java.awt.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.InputStream;

/**
 * Tiny helper to surface native notifications on Windows/macOS (falls back
 * silently elsewhere).
 */
public final class WindowsNotification {

    private static TrayIcon trayIcon;

    private WindowsNotification() {
    }

    public static void show(String title, String message) {
        if (!SystemTray.isSupported()) {
            return;
        }
        try {
            TrayIcon icon = ensureTrayIcon();
            if (icon != null) {
                icon.displayMessage(title, message, TrayIcon.MessageType.INFO);
            }
        } catch (Exception ignored) {
        }
    }

    private static TrayIcon ensureTrayIcon() throws AWTException {
        if (trayIcon != null) {
            return trayIcon;
        }
        SystemTray tray = SystemTray.getSystemTray();
        for (TrayIcon existing : tray.getTrayIcons()) {
            if ("AirBamin".equals(existing.getToolTip())) {
                trayIcon = existing;
                return trayIcon;
            }
        }

        // Try to load the app logo
        Image image = loadAppLogo();
        if (image == null) {
            // Fallback to simple colored icon
            BufferedImage fallback = new BufferedImage(22, 22, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = fallback.createGraphics();
            g.setColor(new Color(16, 185, 129));
            g.fillRoundRect(0, 0, 22, 22, 6, 6);
            g.dispose();
            image = fallback;
        }

        TrayIcon icon = new TrayIcon(image, "AirBamin");
        icon.setImageAutoSize(true);
        tray.add(icon);
        trayIcon = icon;
        return trayIcon;
    }

    private static Image loadAppLogo() {
        try {
            // Try loading the app icon from resources
            InputStream is = WindowsNotification.class.getResourceAsStream("/favicon_io/android-chrome-512x512.png");
            if (is != null) {
                BufferedImage original = ImageIO.read(is);
                is.close();
                // Scale to appropriate tray icon size (22x22 for macOS menu bar)
                BufferedImage scaled = new BufferedImage(22, 22, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g = scaled.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                g.drawImage(original, 0, 0, 22, 22, null);
                g.dispose();
                return scaled;
            }
        } catch (Exception e) {
            System.err.println("Failed to load tray icon: " + e.getMessage());
        }
        return null;
    }
}
