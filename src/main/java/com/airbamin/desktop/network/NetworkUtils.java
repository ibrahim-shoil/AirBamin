package com.airbamin.desktop.network;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

/**
 * Desktop-side copy of the Spring Boot helper that figures out the best LAN IP.
 * This is shown inside the Transfer Center so users know what URL to open on their phone.
 */
public final class NetworkUtils {

    private NetworkUtils() {
    }

    public enum NetworkMode {
        AUTO,
        WIFI,
        HOTSPOT
    }

    public static String findLocalIp(NetworkMode mode) {
        try {
            List<NetworkInterface> all = new ArrayList<>();
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                all.add(interfaces.nextElement());
            }

            if (mode == NetworkMode.AUTO || mode == NetworkMode.HOTSPOT) {
                String hotspotIp = findHotspotIp(all, mode);
                if (hotspotIp != null) {
                    return hotspotIp;
                }
            }

            String wifiIp = findIpOnInterfaces(all, true, mode);
            if (wifiIp != null) {
                return wifiIp;
            }

            String anyIp = findIpOnInterfaces(all, false, mode);
            if (anyIp != null) {
                return anyIp;
            }
        } catch (Exception ignored) {
        }

        return "127.0.0.1";
    }

    private static String findIpOnInterfaces(List<NetworkInterface> interfaces,
                                             boolean wifiOnly,
                                             NetworkMode mode) throws Exception {
        String fallback = null;

        for (NetworkInterface ni : interfaces) {
            if (!ni.isUp() || ni.isLoopback()) {
                continue;
            }

            String displayName = lower(ni.getDisplayName());
            String name = lower(ni.getName());
            boolean hotspotAdapter = looksLikeHotspot(displayName, name);
            boolean allowVirtualHotspot = hotspotAdapter && (mode == NetworkMode.AUTO || mode == NetworkMode.HOTSPOT);

            if (shouldSkipAdapter(ni.isVirtual(), name, displayName, allowVirtualHotspot)) {
                continue;
            }

            boolean looksLikeWifi =
                    displayName.contains("wi-fi") || displayName.contains("wifi") || displayName.contains("wlan")
                            || name.contains("wi-fi") || name.contains("wifi") || name.contains("wlan");
            if (hotspotAdapter) {
                looksLikeWifi = true;
            }

            if (wifiOnly && !looksLikeWifi) {
                continue;
            }
            if (!wifiOnly && looksLikeWifi) {
                continue;
            }

            Enumeration<InetAddress> addresses = ni.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress address = addresses.nextElement();
                if (!(address instanceof Inet4Address) || address.isLoopbackAddress()) {
                    continue;
                }

                String ip = address.getHostAddress();
                if (matchesMode(ip, mode)) {
                    return ip;
                }

                if (fallback == null && isPrivateLanIp(ip)) {
                    fallback = ip;
                }
            }
        }

        return fallback;
    }

    private static String findHotspotIp(List<NetworkInterface> interfaces,
                                        NetworkMode mode) throws Exception {
        for (NetworkInterface ni : interfaces) {
            if (!ni.isUp() || ni.isLoopback()) {
                continue;
            }

            String displayName = lower(ni.getDisplayName());
            String name = lower(ni.getName());
            if (!looksLikeHotspot(displayName, name)) {
                continue;
            }
            if (shouldSkipAdapter(ni.isVirtual(), name, displayName, true)) {
                continue;
            }

            Enumeration<InetAddress> addresses = ni.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress address = addresses.nextElement();
                if (!(address instanceof Inet4Address) || address.isLoopbackAddress()) {
                    continue;
                }
                String ip = address.getHostAddress();
                if (matchesMode(ip, NetworkMode.HOTSPOT)) {
                    return ip;
                }
                if (mode == NetworkMode.AUTO && isPrivateLanIp(ip)) {
                    return ip;
                }
            }
        }
        return null;
    }

    private static boolean matchesMode(String ip, NetworkMode mode) {
        return switch (mode) {
            case WIFI -> ip.startsWith("192.168.") || ip.startsWith("10.");
            case HOTSPOT -> ip.startsWith("192.168.")
                    || ip.startsWith("10.")
                    || (ip.startsWith("172.") && isPrivateLanIp(ip));
            case AUTO -> isPrivateLanIp(ip);
        };
    }

    private static boolean looksLikeHotspot(String displayName, String name) {
        return displayName.contains("mobile hotspot")
                || displayName.contains("wi-fi direct")
                || displayName.contains("wifi direct")
                || displayName.contains("hosted network")
                || displayName.contains("softap")
                || displayName.contains("hotspot")
                || name.contains("hotspot")
                || name.contains("softap")
                || name.contains("wi-fi direct")
                || name.contains("wifi direct");
    }

    private static boolean shouldSkipAdapter(boolean isVirtual,
                                             String name,
                                             String displayName,
                                             boolean allowVirtualHotspot) {
        if (isVirtual && !allowVirtualHotspot) {
            return true;
        }
        if (name.startsWith("vmnet")
                || name.startsWith("vbox")
                || name.startsWith("vmware")
                || name.startsWith("hyperv")) {
            return true;
        }
        if (displayName.contains("vpn") || displayName.contains("tunnel")) {
            return true;
        }
        if (!allowVirtualHotspot && displayName.contains("virtual")) {
            return true;
        }
        return false;
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase();
    }

    private static boolean isPrivateLanIp(String ip) {
        if (ip.startsWith("10.") || ip.startsWith("192.168.")) {
            return true;
        }
        if (ip.startsWith("172.")) {
            String[] parts = ip.split("\\.");
            if (parts.length >= 2) {
                try {
                    int second = Integer.parseInt(parts[1]);
                    return second >= 16 && second <= 31;
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return false;
    }
}
