package com.airbamin.desktop.utils;

import java.io.BufferedInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;

public class UpdateInstaller {

    public static void downloadAndInstall(String downloadUrl) {
        if (downloadUrl == null || downloadUrl.isBlank()) {
            return;
        }

        try {
            // 1. Create temporary file
            Path tempFile = Files.createTempFile("AirBaminUpdate", ".exe");

            // 2. Download file
            try (BufferedInputStream in = new BufferedInputStream(URI.create(downloadUrl).toURL().openStream());
                    FileOutputStream fileOutputStream = new FileOutputStream(tempFile.toFile())) {
                byte[] dataBuffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = in.read(dataBuffer, 0, 1024)) != -1) {
                    fileOutputStream.write(dataBuffer, 0, bytesRead);
                }
            }

            // 3. Execute installer silently
            ProcessBuilder pb = new ProcessBuilder(tempFile.toAbsolutePath().toString(), "/quiet");
            pb.start();

            // 4. Exit application to allow overwrite
            System.exit(0);

        } catch (IOException e) {
            e.printStackTrace();
            // In a real app, we might want to show an error dialog here,
            // but since this is called from a background thread/callback,
            // we should be careful about UI updates.
        }
    }
}
