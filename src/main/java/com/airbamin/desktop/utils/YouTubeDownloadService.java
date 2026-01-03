package com.airbamin.desktop.utils;

import java.io.*;
import java.net.URL;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.regex.*;

import com.google.gson.*;

/**
 * Service for downloading YouTube videos using bundled yt-dlp binary.
 * No Python installation required - uses standalone yt-dlp executable.
 */
public class YouTubeDownloadService {

    private static final String YT_DLP_VERSION = "2024.12.23";
    private static YouTubeDownloadService instance;

    private Path ytDlpPath;
    private Path ffmpegPath;
    private Path downloadsDir;
    private Process currentProcess;
    private volatile boolean cancelled = false;

    public static synchronized YouTubeDownloadService getInstance() {
        if (instance == null) {
            instance = new YouTubeDownloadService();
        }
        return instance;
    }

    private YouTubeDownloadService() {
        // Set default downloads directory
        downloadsDir = Paths.get(System.getProperty("user.home"), "Downloads", "AirBamin", "YouTube");
        try {
            Files.createDirectories(downloadsDir);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * Initialize yt-dlp binary - either bundled or download if missing.
     */
    public CompletableFuture<Boolean> initialize() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Check for bundled or system yt-dlp
                ytDlpPath = findOrDownloadYtDlp();
                ffmpegPath = findFfmpeg();
                return ytDlpPath != null;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        });
    }

    private Path findOrDownloadYtDlp() throws IOException {
        // First check if bundled in app resources
        Path appDir = getAppDataDir();
        Path bundledPath = appDir.resolve("yt-dlp" + getExecutableExtension());

        if (Files.exists(bundledPath) && Files.isExecutable(bundledPath)) {
            return bundledPath;
        }

        // Check system PATH
        String systemYtDlp = findInPath("yt-dlp");
        if (systemYtDlp != null) {
            return Paths.get(systemYtDlp);
        }

        // Download yt-dlp if not found
        return downloadYtDlp(bundledPath);
    }

    private Path downloadYtDlp(Path targetPath) throws IOException {
        String os = System.getProperty("os.name").toLowerCase();
        String downloadUrl;

        if (os.contains("mac")) {
            downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
        } else if (os.contains("win")) {
            downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
        } else {
            downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
        }

        System.out.println("Downloading yt-dlp from: " + downloadUrl);
        Files.createDirectories(targetPath.getParent());

        try (InputStream in = new URL(downloadUrl).openStream()) {
            Files.copy(in, targetPath, StandardCopyOption.REPLACE_EXISTING);
        }

        // Make executable on Unix
        if (!os.contains("win")) {
            targetPath.toFile().setExecutable(true);
        }

        return targetPath;
    }

    private Path findFfmpeg() {
        String ffmpeg = findInPath("ffmpeg");
        return ffmpeg != null ? Paths.get(ffmpeg) : null;
    }

    private String findInPath(String executable) {
        String pathEnv = System.getenv("PATH");
        if (pathEnv == null)
            return null;

        String ext = System.getProperty("os.name").toLowerCase().contains("win") ? ".exe" : "";

        for (String dir : pathEnv.split(File.pathSeparator)) {
            Path path = Paths.get(dir, executable + ext);
            if (Files.isExecutable(path)) {
                return path.toString();
            }
        }
        return null;
    }

    private Path getAppDataDir() {
        String os = System.getProperty("os.name").toLowerCase();
        String homeDir = System.getProperty("user.home");

        if (os.contains("mac")) {
            return Paths.get(homeDir, "Library", "Application Support", "AirBamin");
        } else if (os.contains("win")) {
            String appData = System.getenv("LOCALAPPDATA");
            return Paths.get(appData != null ? appData : homeDir, "AirBamin");
        } else {
            return Paths.get(homeDir, ".airbamin");
        }
    }

    private String getExecutableExtension() {
        return System.getProperty("os.name").toLowerCase().contains("win") ? ".exe" : "";
    }

    public boolean isReady() {
        return ytDlpPath != null && Files.isExecutable(ytDlpPath);
    }

    public Path getDownloadsDir() {
        return downloadsDir;
    }

    public void setDownloadsDir(Path dir) {
        this.downloadsDir = dir;
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * Video information holder
     */
    public static class VideoInfo {
        public String id;
        public String title;
        public String channel;
        public String channelUrl;
        public long duration; // seconds
        public String thumbnailUrl;
        public String description;
        public long viewCount;
        public String uploadDate;
        public List<Format> formats = new ArrayList<>();
        public List<SubtitleTrack> subtitles = new ArrayList<>();

        public String getDurationString() {
            long hours = duration / 3600;
            long minutes = (duration % 3600) / 60;
            long seconds = duration % 60;
            if (hours > 0) {
                return String.format("%d:%02d:%02d", hours, minutes, seconds);
            }
            return String.format("%d:%02d", minutes, seconds);
        }
    }

    public static class Format {
        public String formatId;
        public String ext;
        public int height;
        public int width;
        public String fps;
        public long filesize;
        public String quality;
        public boolean hasVideo;
        public boolean hasAudio;
        public String acodec;
        public String vcodec;
        public int abr; // audio bitrate

        public String getDisplayName() {
            String sizeStr = filesize > 0 ? " ~ " + humanReadableByteCount(filesize) : "";
            if (hasVideo && height > 0) {
                String q = height >= 2160 ? "4K"
                        : height >= 1440 ? "2K" : height >= 1080 ? "FHD" : height >= 720 ? "HD" : "SD";
                return String.format("%dp %s (%s)%s", height, q, ext, sizeStr);
            } else if (hasAudio) {
                return String.format("Audio %dkbps (%s)%s", abr, ext, sizeStr);
            }
            return formatId + sizeStr;
        }

        private String humanReadableByteCount(long bytes) {
            if (-1000 < bytes && bytes < 1000) {
                return bytes + " B";
            }
            java.text.CharacterIterator ci = new java.text.StringCharacterIterator("kMGTPE");
            while (bytes <= -999950 || bytes >= 999950) {
                bytes /= 1000;
                ci.next();
            }
            return String.format(java.util.Locale.US, "%.1f %cB", bytes / 1000.0, ci.current());
        }
    }

    public static class SubtitleTrack {
        public String code;
        public String name;
        public boolean isAutoGenerated;
    }

    /**
     * Download progress callback
     */
    public interface ProgressCallback {
        void onProgress(double percent, String status, String size, String speed, String eta);

        void onComplete(Path outputFile);

        void onError(String error);
    }

    /**
     * Fetch video information
     */
    public CompletableFuture<VideoInfo> fetchVideoInfo(String url) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                List<String> command = new ArrayList<>();
                command.add(ytDlpPath.toString());
                command.add("--dump-json");
                command.add("--no-download");
                command.add("--no-warnings");
                // Use a standard browser user agent to avoid bot detection/429 errors
                command.add("--user-agent");
                command.add(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                command.add(url);

                ProcessBuilder pb = new ProcessBuilder(command);
                pb.redirectErrorStream(true);
                Process process = pb.start();

                StringBuilder output = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        output.append(line);
                    }
                }

                int exitCode = process.waitFor();
                if (exitCode != 0) {
                    throw new RuntimeException("yt-dlp exited with code " + exitCode);
                }

                return parseVideoInfo(output.toString());

            } catch (Exception e) {
                throw new CompletionException(e);
            }
        });
    }

    private VideoInfo parseVideoInfo(String json) {
        JsonObject obj = JsonParser.parseString(json).getAsJsonObject();
        VideoInfo info = new VideoInfo();

        info.id = getStringOrNull(obj, "id");
        info.title = getStringOrNull(obj, "title");
        info.channel = getStringOrNull(obj, "channel");
        if (info.channel == null)
            info.channel = getStringOrNull(obj, "uploader");
        info.channelUrl = getStringOrNull(obj, "channel_url");
        info.duration = obj.has("duration") && !obj.get("duration").isJsonNull() ? obj.get("duration").getAsLong() : 0;
        info.thumbnailUrl = getStringOrNull(obj, "thumbnail");
        info.description = getStringOrNull(obj, "description");
        info.viewCount = obj.has("view_count") && !obj.get("view_count").isJsonNull()
                ? obj.get("view_count").getAsLong()
                : 0;
        info.uploadDate = getStringOrNull(obj, "upload_date");

        // Parse formats
        if (obj.has("formats") && obj.get("formats").isJsonArray()) {
            JsonArray formats = obj.getAsJsonArray("formats");
            Set<String> seenQualities = new HashSet<>();

            for (int i = formats.size() - 1; i >= 0; i--) {
                JsonObject f = formats.get(i).getAsJsonObject();
                Format format = new Format();
                format.formatId = getStringOrNull(f, "format_id");
                format.ext = getStringOrNull(f, "ext");
                format.height = f.has("height") && !f.get("height").isJsonNull() ? f.get("height").getAsInt() : 0;
                format.width = f.has("width") && !f.get("width").isJsonNull() ? f.get("width").getAsInt() : 0;
                format.fps = getStringOrNull(f, "fps");
                format.filesize = f.has("filesize") && !f.get("filesize").isJsonNull() ? f.get("filesize").getAsLong()
                        : (f.has("filesize_approx") && !f.get("filesize_approx").isJsonNull()
                                ? f.get("filesize_approx").getAsLong()
                                : 0);
                format.acodec = getStringOrNull(f, "acodec");
                format.vcodec = getStringOrNull(f, "vcodec");
                format.abr = f.has("abr") && !f.get("abr").isJsonNull() ? f.get("abr").getAsInt() : 0;

                format.hasVideo = format.vcodec != null && !format.vcodec.equals("none");
                format.hasAudio = format.acodec != null && !format.acodec.equals("none");

                // Only add unique video qualities
                if (format.hasVideo && format.height > 0) {
                    String key = format.height + "p";
                    if (!seenQualities.contains(key)) {
                        seenQualities.add(key);
                        info.formats.add(format);
                    }
                }
            }
            // Sort by height descending
            info.formats.sort((a, b) -> Integer.compare(b.height, a.height));
        }

        // Parse subtitles
        if (obj.has("subtitles") && obj.get("subtitles").isJsonObject()) {
            JsonObject subs = obj.getAsJsonObject("subtitles");
            for (String code : subs.keySet()) {
                SubtitleTrack track = new SubtitleTrack();
                track.code = code;
                track.name = code;
                track.isAutoGenerated = false;
                info.subtitles.add(track);
            }
        }
        if (obj.has("automatic_captions") && obj.get("automatic_captions").isJsonObject()) {
            JsonObject autos = obj.getAsJsonObject("automatic_captions");
            for (String code : autos.keySet()) {
                SubtitleTrack track = new SubtitleTrack();
                track.code = code;
                track.name = code + " (auto)";
                track.isAutoGenerated = true;
                info.subtitles.add(track);
            }
        }

        return info;
    }

    private String getStringOrNull(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : null;
    }

    /**
     * Download video with specified options
     */
    public void downloadVideo(String url, DownloadOptions options, ProgressCallback callback) {
        cancelled = false;

        CompletableFuture.runAsync(() -> {
            try {
                List<String> command = buildDownloadCommand(url, options);

                ProcessBuilder pb = new ProcessBuilder(command);
                pb.redirectErrorStream(true);
                currentProcess = pb.start();

                Pattern progressPattern = Pattern.compile("\\[download\\]\\s+(\\d+\\.?\\d*)%.*");
                Pattern downloadingPattern = Pattern
                        .compile("\\[download\\].*of\\s+(\\S+).*at\\s+(\\S+).*ETA\\s+(\\S+)");
                Pattern completePattern = Pattern.compile("\\[download\\].*has already been downloaded");
                Pattern mergerPattern = Pattern.compile("\\[Merger\\].*Merging formats into \"(.+)\"");
                Pattern destPattern = Pattern.compile("\\[download\\] Destination: (.+)");

                String lastFile = null;

                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(currentProcess.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (cancelled) {
                            currentProcess.destroyForcibly();
                            callback.onError("Download cancelled");
                            return;
                        }

                        System.out.println("[yt-dlp] " + line);

                        Matcher destMatcher = destPattern.matcher(line);
                        if (destMatcher.find()) {
                            lastFile = destMatcher.group(1);
                        }

                        Matcher mergerMatcher = mergerPattern.matcher(line);
                        if (mergerMatcher.find()) {
                            lastFile = mergerMatcher.group(1);
                        }

                        Matcher progressMatcher = progressPattern.matcher(line);
                        if (progressMatcher.find()) {
                            double percent = Double.parseDouble(progressMatcher.group(1));

                            String size = "N/A";
                            String speed = "N/A";
                            String eta = "N/A";
                            Matcher dlMatcher = downloadingPattern.matcher(line);
                            if (dlMatcher.find()) {
                                size = dlMatcher.group(1);
                                speed = dlMatcher.group(2);
                                eta = dlMatcher.group(3);
                            }

                            callback.onProgress(percent, "Downloading...", size, speed, eta);
                        }

                        if (line.contains("[Merger]") || line.contains("[ffmpeg]")) {
                            callback.onProgress(99, "Processing...", "N/A", "N/A", "N/A");
                        }
                    }
                }

                int exitCode = currentProcess.waitFor();
                currentProcess = null;

                if (exitCode == 0) {
                    Path outputFile = lastFile != null ? Paths.get(lastFile) : downloadsDir;
                    callback.onComplete(outputFile);
                } else {
                    callback.onError("Download failed with exit code: " + exitCode);
                }

            } catch (Exception e) {
                e.printStackTrace();
                callback.onError("Error: " + e.getMessage());
            }
        });

    }

    private List<String> buildDownloadCommand(String url, DownloadOptions options) {
        List<String> cmd = new ArrayList<>();
        cmd.add(ytDlpPath.toString());

        // Use a standard browser user agent
        cmd.add("--user-agent");
        cmd.add("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        // Output template
        cmd.add("-o");
        if (options.audioOnly) {
            cmd.add(downloadsDir.resolve("%(title)s (Audio).%(ext)s").toString());
        } else {
            // Include height (resolution) in filename, e.g. "Title - 1080p.mp4"
            cmd.add(downloadsDir.resolve("%(title)s - %(height)sp.%(ext)s").toString());
        }

        // Subtitle output template: use dash instead of dot, e.g. "Title - 360p-en.srt"
        cmd.add("-o");
        if (options.audioOnly) {
            cmd.add("subtitle:" + downloadsDir.resolve("%(title)s (Audio)-%(sub_lang)s.%(ext)s").toString());
        } else {
            cmd.add("subtitle:" + downloadsDir.resolve("%(title)s - %(height)sp-%(sub_lang)s.%(ext)s").toString());
        }

        // Thumbnail output template
        cmd.add("-o");
        if (options.audioOnly) {
            cmd.add("thumbnail:" + downloadsDir.resolve("%(title)s (Audio).%(ext)s").toString());
        } else {
            cmd.add("thumbnail:" + downloadsDir.resolve("%(title)s - %(height)sp.%(ext)s").toString());
        }

        // Progress display
        cmd.add("--newline");
        cmd.add("--progress");

        // Format selection
        if (options.audioOnly) {
            cmd.add("-x"); // Extract audio
            cmd.add("--audio-format");
            cmd.add(options.audioFormat != null ? options.audioFormat : "mp3");
            cmd.add("--audio-quality");
            cmd.add("0"); // Best quality
        } else if (options.quality != null && !options.quality.isEmpty()) {
            int height = extractHeight(options.quality);
            if (height > 0) {
                cmd.add("-f");
                // STRICT H.264 (avc1) + AAC for Premiere Pro / NLE compatibility
                // No VP9/AV1 fallback - we'll recode if necessary
                cmd.add(String.format(
                        "bestvideo[height<=%d][vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[height<=%d][vcodec^=avc]+bestaudio[ext=m4a]/bestvideo[height<=%d][ext=mp4][vcodec!^=vp][vcodec!^=av01]+bestaudio[ext=m4a]",
                        height, height, height));
            } else {
                cmd.add("-f");
                cmd.add("bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[vcodec^=avc]+bestaudio[ext=m4a]/bestvideo[ext=mp4][vcodec!^=vp][vcodec!^=av01]+bestaudio[ext=m4a]");
            }

            // Force re-encode to H.264 if source codec is incompatible
            cmd.add("--recode-video");
            cmd.add("mp4");

            // Output format
            if (options.outputFormat != null) {
                cmd.add("--merge-output-format");
                cmd.add(options.outputFormat);
            }
        } else {
            // Default: prefer standard compatibility
            cmd.add("-f");
            cmd.add("bestvideo[vcodec^=avc1]+bestaudio[acodec^=mp4a]/bestvideo[vcodec^=avc]+bestaudio[ext=m4a]/bestvideo[ext=mp4][vcodec!^=vp][vcodec!^=av01]+bestaudio[ext=m4a]");

            // Force re-encode to H.264 if needed
            cmd.add("--recode-video");
            cmd.add("mp4");
        }

        // Subtitles
        if (options.downloadSubtitles) {
            cmd.add("--write-subs");
            cmd.add("--write-auto-subs");
            if (options.subtitleLangs != null && !options.subtitleLangs.isEmpty()) {
                cmd.add("--sub-langs");
                cmd.add(String.join(",", options.subtitleLangs));
            }
            cmd.add("--convert-subs");
            cmd.add("srt");
        }

        // Embed subtitles
        if (options.embedSubtitles) {
            cmd.add("--embed-subs");
        }

        // Thumbnail
        if (options.downloadThumbnail) {
            cmd.add("--write-thumbnail");
        }

        // Embed thumbnail
        if (options.embedThumbnail) {
            cmd.add("--embed-thumbnail");
        }

        // Add URL last
        cmd.add(url);

        return cmd;
    }

    private int extractHeight(String quality) {
        if (quality == null)
            return 0;
        try {
            return Integer.parseInt(quality.replace("p", "").trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    public void cancel() {
        cancelled = true;
        if (currentProcess != null) {
            currentProcess.destroyForcibly();
        }
    }

    /**
     * Download options holder
     */
    public static class DownloadOptions {
        public boolean audioOnly = false;
        public String audioFormat = "mp3"; // mp3, m4a, wav, flac
        public String quality = null; // 1080p, 720p, etc.
        public String outputFormat = "mp4"; // mp4, mkv, webm
        public boolean downloadSubtitles = false;
        public boolean embedSubtitles = false;
        public List<String> subtitleLangs = null;
        public boolean downloadThumbnail = false;
        public boolean embedThumbnail = false;
    }

    /**
     * Format file size for display
     */
    public static String formatFileSize(long bytes) {
        if (bytes <= 0)
            return "Unknown";
        if (bytes >= 1024L * 1024 * 1024) {
            return String.format("%.1f GB", bytes / (1024.0 * 1024 * 1024));
        } else if (bytes >= 1024 * 1024) {
            return String.format("%.1f MB", bytes / (1024.0 * 1024));
        } else if (bytes >= 1024) {
            return String.format("%.1f KB", bytes / 1024.0);
        }
        return bytes + " B";
    }
}
