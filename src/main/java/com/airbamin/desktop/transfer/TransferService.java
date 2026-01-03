package com.airbamin.desktop.transfer;

import com.airbamin.desktop.network.NetworkUtils;
import com.airbamin.desktop.storage.LocalStorage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Pure JavaFX copy of the Spring UploadController logic.
 * Handles naming, storing, and listing shared files that phones can download.
 */
public class TransferService {

    private final Path uploadDir;
    private static final DateTimeFormatter NAME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss-SSS");

    public TransferService() {
        this(LocalStorage.loadUploadDirPath()
                .orElse(Paths.get(System.getProperty("user.home"), "Downloads", "AirBamin", "Transfer")));
    }

    public TransferService(Path uploadDir) {
        this.uploadDir = uploadDir;
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to create upload directory " + uploadDir, e);
        }
    }

    public Path getUploadDir() {
        return uploadDir;
    }

    /**
     * Copy a local file into the shared AirBamin folder using the timestamp naming
     * convention.
     */
    public FileRecord saveFile(Path sourceFile) throws IOException {
        if (!Files.exists(sourceFile) || Files.isDirectory(sourceFile)) {
            throw new IOException("Source file does not exist or is a directory: " + sourceFile);
        }

        String original = sourceFile.getFileName().toString();
        String storedName = buildStoredName(original);
        Path target = uploadDir.resolve(storedName);

        Files.copy(sourceFile, target, StandardCopyOption.REPLACE_EXISTING);
        return toFileRecord(target);
    }

    public FileRecord saveStream(String originalFilename, InputStream data) throws IOException {
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "upload.bin";
        }
        String storedName = buildStoredName(originalFilename);
        Path target = uploadDir.resolve(storedName);
        Files.copy(data, target, StandardCopyOption.REPLACE_EXISTING);
        return toFileRecord(target);
    }

    public List<FileRecord> listFiles() throws IOException {
        if (!Files.exists(uploadDir)) {
            return List.of();
        }

        try (Stream<Path> stream = Files.list(uploadDir)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(this::safeToFileRecord)
                    .sorted(Comparator.comparing(FileRecord::lastModified).reversed())
                    .collect(Collectors.toList());
        }
    }

    private FileRecord safeToFileRecord(Path path) {
        try {
            return toFileRecord(path);
        } catch (IOException e) {
            return new FileRecord(path.getFileName().toString(), 0L, LocalDateTime.MIN);
        }
    }

    private FileRecord toFileRecord(Path path) throws IOException {
        BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
        LocalDateTime lastModified = LocalDateTime.ofInstant(
                attrs.lastModifiedTime().toInstant(),
                ZoneId.systemDefault());
        return new FileRecord(path.getFileName().toString(), attrs.size(), lastModified);
    }

    private String buildStoredName(String originalFilename) {
        Path target = uploadDir.resolve(originalFilename);
        if (!Files.exists(target)) {
            return originalFilename;
        }

        String ext = "";
        String nameWithoutExt = originalFilename;

        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex >= 0) {
            ext = originalFilename.substring(dotIndex);
            nameWithoutExt = originalFilename.substring(0, dotIndex);
        }

        int counter = 1;
        while (Files.exists(target)) {
            String newName = nameWithoutExt + "_" + counter + ext;
            target = uploadDir.resolve(newName);
            counter++;
        }

        return target.getFileName().toString();
    }

    public String buildPhoneUrl(NetworkUtils.NetworkMode mode, String overrideIp, int port) {
        String ip = (overrideIp != null && !overrideIp.isBlank())
                ? overrideIp.trim()
                : NetworkUtils.findLocalIp(mode);
        return "http://" + ip + ":" + port;
    }

    public record FileRecord(String name, long sizeBytes, LocalDateTime lastModified) {
        public long sizeKb() {
            return Math.max(1, sizeBytes / 1024);
        }

        public String formattedDate() {
            if (lastModified == LocalDateTime.MIN) {
                return "Unknown";
            }
            return lastModified.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }

        public String humanReadableSize() {
            double bytes = sizeBytes;
            if (bytes >= 1024 * 1024 * 1024) {
                return String.format("%.2f GB", bytes / (1024 * 1024 * 1024));
            }
            if (bytes >= 1024 * 1024) {
                return String.format("%.2f MB", bytes / (1024 * 1024));
            }
            if (bytes >= 1024) {
                return String.format("%.2f KB", bytes / 1024);
            }
            return String.format("%.0f B", bytes);
        }
    }
}
