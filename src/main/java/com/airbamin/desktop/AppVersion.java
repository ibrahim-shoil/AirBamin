package com.airbamin.desktop;

/**
 * Central place for the current desktop version used in update checks.
 */
public final class AppVersion {

    private AppVersion() {
    }

    /**
     * Version is resolved at runtime to reduce rebuilds:
     * 1) System property "app.version" if provided (e.g., via
     * jpackage/java-options)
     * 2) Implementation-Version from the packaged manifest
     * 3) Fallback constant below
     */
    public static final String VERSION = resolveVersion();

    private static final String FALLBACK = "1.4.0";

    private static String resolveVersion() {
        String sysProp = System.getProperty("app.version");
        if (sysProp != null && !sysProp.isBlank()) {
            return sysProp.trim();
        }

        try {
            String impl = AppVersion.class.getPackage().getImplementationVersion();
            if (impl != null && !impl.isBlank()) {
                return impl.trim();
            }
        } catch (Exception ignored) {
        }

        return FALLBACK;
    }
}
