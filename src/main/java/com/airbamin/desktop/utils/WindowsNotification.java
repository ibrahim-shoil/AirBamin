package com.airbamin.desktop.utils;

import java.awt.*;
import java.awt.image.BufferedImage;

/**
 * Tiny helper to surface native notifications on Windows (falls back silently elsewhere).
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
        BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        g.setColor(new Color(16, 185, 129));
        g.fillRoundRect(0, 0, 16, 16, 6, 6);
        g.dispose();
        TrayIcon icon = new TrayIcon(image, "AirBamin");
        icon.setImageAutoSize(true);
        tray.add(icon);
        trayIcon = icon;
        return trayIcon;
    }
}
