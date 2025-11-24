package com.airbamin.desktop.transfer;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Lightweight HTTP server that mirrors the critical Spring endpoints locally.
 * Phones can open http://<ip>:9090 to upload/downoad files without running the
 * full backend.
 */
public class LocalTransferServer {

    private static final int PORT = 9090;
    private static LocalTransferServer INSTANCE;

    private volatile TransferService transferService = new TransferService();
    private HttpServer server;
    private ExecutorService executor;
    private final CopyOnWriteArrayList<ServerListener> listeners = new CopyOnWriteArrayList<>();
    private int activePort = PORT;
    private Thread shutdownHook;

    private LocalTransferServer() {
    }

    public static synchronized LocalTransferServer getInstance() {
        if (INSTANCE == null) {
            INSTANCE = new LocalTransferServer();
        }
        return INSTANCE;
    }

    private final CopyOnWriteArrayList<java.io.File> hostedFiles = new CopyOnWriteArrayList<>();

    public void hostFiles(List<java.io.File> files) {
        hostedFiles.clear();
        if (files != null) {
            hostedFiles.addAll(files);
        }
    }

    public synchronized boolean start() {
        if (server != null) {
            return true;
        }

        int candidate = PORT;
        while (candidate < PORT + 100) {
            try {
                // Bind to 0.0.0.0 (all interfaces) so phones can connect
                HttpServer created = HttpServer.create(new InetSocketAddress("0.0.0.0", candidate), 0);
                configureServer(created);
                activePort = candidate;
                server = created;
                server.start();
                registerShutdownHook();
                System.out.println("Transfer server started on port: " + candidate);
                return true;
            } catch (IOException e) {
                candidate++;
            }
        }

        System.err
                .println("Failed to start local transfer server: All ports (" + PORT + "-" + (PORT + 99) + ") in use");
        return false;
    }

    public synchronized void stop() {
        if (server != null) {
            server.stop(0);
            server = null;
        }
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
        if (shutdownHook != null) {
            Runtime.getRuntime().removeShutdownHook(shutdownHook);
            shutdownHook = null;
        }
    }

    private void configureServer(HttpServer server) {
        server.createContext("/", this::handleRoot);
        server.createContext("/ping", this::handlePing);
        server.createContext("/upload", this::handleUpload);
        server.createContext("/files", this::handleFiles);
        server.createContext("/download", this::handleDownload);

        // Reverse Transfer Endpoints
        server.createContext("/api/files/list-hosted", this::handleListHosted);
        server.createContext("/api/files/download-hosted", this::handleDownloadHosted);
        server.createContext("/api/mirror/start", this::handleMirrorStart);
        server.createContext("/disconnect", this::handleDisconnect);

        executor = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "transfer-http");
            t.setDaemon(true);
            return t;
        });
        server.setExecutor(executor);
    }

    private void registerShutdownHook() {
        if (shutdownHook != null) {
            return;
        }
        shutdownHook = new Thread(this::stop, "transfer-http-shutdown");
        Runtime.getRuntime().addShutdownHook(shutdownHook);
    }

    /**
     * Handle ping requests from mobile app for connection testing
     */
    private void handlePing(HttpExchange exchange) throws IOException {
        // Notify listeners that a client connected (updates UI)
        notifyClientConnected(exchange);

        // Allow both GET and POST for flexibility
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod()) &&
                !"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        // Add CORS headers for mobile app
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.add("Access-Control-Allow-Headers", "Content-Type");

        // Send simple OK response
        sendResponse(exchange, 200, "pong");
    }

    public int getActivePort() {
        return activePort;
    }

    public TransferService getTransferService() {
        return transferService;
    }

    public synchronized void updateUploadDir(Path newPath) {
        if (newPath == null) {
            return;
        }
        transferService = new TransferService(newPath);
    }

    private void handleRoot(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }
        String html = """
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                            <title>AirBamin - Upload</title>
                            <style>
                                * { margin:0; padding:0; box-sizing:border-box; }
                                body {
                                    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
                                    background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                                    min-height:100vh;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    padding:20px;
                                }
                                .container {
                                    background:#fff;
                                    padding:30px;
                                    border-radius:20px;
                                    box-shadow:0 20px 60px rgba(0,0,0,0.3);
                                    max-width:520px;
                                    width:100%;
                                }
                                .logo { text-align:center; font-size:64px; margin-bottom:18px; }
                                h1 { text-align:center; color:#1f2937; margin-bottom:6px; }
                                .sub { text-align:center; color:#6b7280; margin-bottom:24px; }
                                .upload-area {
                                    border:3px dashed #667eea;
                                    border-radius:16px;
                                    padding:46px 24px;
                                    background:#f8f9ff;
                                    text-align:center;
                                    transition:all .3s;
                                    cursor:pointer;
                                    margin-bottom:18px;
                                }
                                .upload-area.dragover { border-color:#10b981; background:#d1fae5; }
                                input[type=file] { display:none; }
                                .file-label {
                                    display:inline-block;
                                    padding:14px 30px;
                                    border-radius:12px;
                                    background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
                                    color:#fff;
                                    font-weight:700;
                                }
                                .file-info {
                                    margin:15px 0;
                                    padding:14px;
                                    border-radius:12px;
                                    background:linear-gradient(135deg,#e0e7ff,#ddd6fe);
                                    display:none;
                                    font-weight:600;
                                }
                                .upload-btn {
                                    width:100%;
                                    padding:18px;
                                    background:linear-gradient(135deg,#10b981,#059669);
                                    border:none;
                                    border-radius:12px;
                                    color:#fff;
                                    font-size:18px;
                                    font-weight:800;
                                    cursor:pointer;
                                    text-transform:uppercase;
                                }
                                .upload-btn:disabled { opacity:.4; cursor:not-allowed; }
                                .progress-container { margin:22px 0; display:none; }
                                .progress-wrapper {
                                    width:100%;
                                    height:40px;
                                    background:#e5e7eb;
                                    border-radius:22px;
                                    overflow:hidden;
                                    position:relative;
                                }
                                .progress-bar {
                                    height:100%;
                                    width:0%;
                                    background:linear-gradient(90deg,#667eea,#764ba2);
                                    transition:width .2s linear;
                                }
                                .progress-text {
                                    position:absolute;
                                    top:50%;
                                    left:50%;
                                    transform:translate(-50%,-50%);
                                    font-weight:800;
                                    color:#1f2937;
                                }
                                .status {
                                    text-align:center;
                                    font-weight:700;
                                    padding:14px;
                                    border-radius:12px;
                                    display:none;
                                }
                                .status.success { background:#d1fae5; color:#065f46; }
                                .status.error { background:#fee2e2; color:#991b1b; }
                                .links { margin-top:14px; text-align:center; font-size:14px; }
                                .links a { color:#4f46e5; text-decoration:none; font-weight:600; }
                            </style>
                        </head>
                        <body>
                        <div class="container">
                            <div class="logo">✈️</div>
                            <h1>AirBamin</h1>
                            <p class="sub">Phone → PC Upload</p>
                            <form id="uploadForm">
                                <div class="upload-area" id="uploadArea">
                                    <div style="font-size:48px;margin-bottom:10px;">📁</div>
                                    <label for="fileInput" class="file-label">Select Files</label>
                                    <input type="file" id="fileInput" multiple>
                                </div>
                                <div class="file-info" id="fileInfo"></div>
                                <div class="progress-container" id="progressContainer">
                                    <div class="progress-wrapper">
                                        <div class="progress-bar" id="progressBar"></div>
                                        <div class="progress-text" id="progressText">0%</div>
                                    </div>
                                </div>
                                <button type="submit" class="upload-btn" id="uploadBtn" disabled>Start Upload</button>
                                <div class="status" id="status"></div>
                            </form>
                            <div class="links">
                                <a href="/files">View uploaded files</a>
                            </div>
                        </div>
                        <script>
                            const fileInput = document.getElementById('fileInput');
                            const uploadArea = document.getElementById('uploadArea');
                            const uploadBtn = document.getElementById('uploadBtn');
                            const fileInfo = document.getElementById('fileInfo');
                            const progressContainer = document.getElementById('progressContainer');
                            const progressBar = document.getElementById('progressBar');
                            const progressText = document.getElementById('progressText');
                            const statusEl = document.getElementById('status');

                            uploadArea.addEventListener('dragover', (e) => {
                                e.preventDefault();
                                uploadArea.classList.add('dragover');
                            });
                            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
                            uploadArea.addEventListener('drop', (e) => {
                                e.preventDefault();
                                uploadArea.classList.remove('dragover');
                                fileInput.files = e.dataTransfer.files;
                                handleFiles();
                            });
                            fileInput.addEventListener('change', handleFiles);

                            function handleFiles() {
                                const files = fileInput.files;
                                if (!files.length) { uploadBtn.disabled = true; return; }
                                let totalSize = 0;
                                for (let i = 0; i < files.length; i++) totalSize += files[i].size;
                                fileInfo.innerHTML = `<strong>${files.length}</strong> file(s) | <strong>${(totalSize / (1024*1024)).toFixed(2)} MB</strong>`;
                                fileInfo.style.display = 'block';
                                uploadBtn.disabled = false;
                            }

                            document.getElementById('uploadForm').addEventListener('submit', async (e) => {
                                e.preventDefault();
                                const files = fileInput.files;
                                if (!files.length) return;

                                uploadBtn.disabled = true;
                                progressContainer.style.display = 'block';
                                statusEl.style.display = 'block';
                                statusEl.className = 'status';
                                statusEl.textContent = '⚡ Uploading… keep this page open.';

                                let total = 0;
                                for (let i = 0; i < files.length; i++) total += files[i].size;
                                let uploaded = 0;

                const batchId = Date.now().toString();

                for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    await new Promise((resolve) => {
                                        const xhr = new XMLHttpRequest();
                                        xhr.upload.addEventListener('progress', (evt) => {
                                            if (evt.lengthComputable) {
                                                const percent = Math.round(((uploaded + evt.loaded) / total) * 100);
                                                progressBar.style.width = percent + '%';
                                                progressText.textContent = percent + '%';
                                            }
                                        });
                                        xhr.onload = () => { uploaded += file.size; resolve(); };
                                        xhr.onerror = () => { statusEl.className = 'status error'; statusEl.textContent = 'Upload failed'; resolve(); };
                                        xhr.open('PUT', '/upload?filename=' + encodeURIComponent(file.name) + '&batchId=' + batchId + '&index=' + (i+1) + '&total=' + files.length);
                                        xhr.send(file);
                                    });
                                }

                                statusEl.className = 'status success';
                                statusEl.textContent = '✅ Upload complete! Files saved to your PC.';
                                setTimeout(() => { statusEl.style.display = 'none'; }, 3500);
                                setTimeout(() => { location.reload(); }, 3000);
                            });
                        </script>
                        </body>
                        </html>
                        """;
        sendHtml(exchange, html);
    }

    private void handleUpload(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);

        String method = exchange.getRequestMethod();

        // Add CORS headers for mobile app
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "PUT, POST, OPTIONS");
        headers.add("Access-Control-Allow-Headers", "Content-Type");

        // Handle OPTIONS preflight request
        if ("OPTIONS".equalsIgnoreCase(method)) {
            sendResponse(exchange, 200, "OK");
            return;
        }

        // Accept both PUT (web) and POST (mobile app)
        if (!"PUT".equalsIgnoreCase(method) && !"POST".equalsIgnoreCase(method)) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        Map<String, String> params = queryParams(exchange.getRequestURI());
        String filename = params.getOrDefault("filename", "upload.bin");
        String batchId = params.getOrDefault("batchId", "");
        int index = parseInt(params.get("index"), 1);
        int total = parseInt(params.get("total"), 1);
        notifyUploadStarted(exchange, filename);

        long contentLength = readContentLength(exchange);

        try (InputStream body = wrapWithProgress(exchange, filename, contentLength, exchange.getRequestBody())) {
            TransferService.FileRecord record = transferService.saveStream(filename, body);
            notifyUploadCompleted(exchange, record);
            if (total <= 1 || index >= total) {
                notifyBatchCompleted(exchange, batchId);
            }
            sendResponse(exchange, 200, "Uploaded " + record.name());
        } catch (IOException e) {
            sendResponse(exchange, 500, "Upload failed: " + e.getMessage());
        }
    }

    private void handleFiles(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        List<TransferService.FileRecord> files = transferService.listFiles();
        StringBuilder sb = new StringBuilder();
        sb.append("""
                <!DOCTYPE html>
                <html><head><meta charset='UTF-8'><title>Uploaded Files</title>
                <style>
                body{font-family:Arial;background:#111;color:#eee;padding:24px;}
                table{width:100%;border-collapse:collapse;}
                th,td{border:1px solid #333;padding:8px;}
                th{background:#1f2937;}
                a{color:#38bdf8;}
                </style></head><body>
                <h2>Uploaded Files</h2>
                <p><a href='/'>← Back to upload page</a></p>
                """);
        if (files.isEmpty()) {
            sb.append("<p>No files uploaded yet.</p>");
        } else {
            sb.append(
                    "<table><tr><th>#</th><th>Name</th><th>Size (KB)</th><th>Last Modified</th><th>Download</th></tr>");
            int index = 1;
            for (TransferService.FileRecord file : files) {
                sb.append("<tr><td>")
                        .append(index++)
                        .append("</td><td>")
                        .append(escape(file.name()))
                        .append("</td><td>")
                        .append(file.sizeKb())
                        .append("</td><td>")
                        .append(escape(file.formattedDate()))
                        .append("</td><td><a href=\"/download?filename=")
                        .append(urlEncode(file.name()))
                        .append("\">Download</a></td></tr>");
            }
            sb.append("</table>");
        }
        sb.append("</body></html>");

        sendHtml(exchange, sb.toString());
    }

    private void handleDownload(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }
        String filename = queryParams(exchange.getRequestURI()).get("filename");
        if (filename == null) {
            sendResponse(exchange, 400, "Missing filename");
            return;
        }

        Path path = transferService.getUploadDir().resolve(filename).normalize();
        if (!path.startsWith(transferService.getUploadDir()) || !Files.exists(path)) {
            sendResponse(exchange, 404, "Not found");
            return;
        }

        Headers headers = exchange.getResponseHeaders();
        headers.add("Content-Type", "application/octet-stream");
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        exchange.sendResponseHeaders(200, Files.size(path));
        try (OutputStream os = exchange.getResponseBody()) {
            Files.copy(path, os);
        }
    }

    private void handleListHosted(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);

        // CORS
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.add("Access-Control-Allow-Headers", "Content-Type");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 200, "OK");
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < hostedFiles.size(); i++) {
            java.io.File file = hostedFiles.get(i);
            json.append(String.format("{\"name\":\"%s\",\"size\":%d}",
                    escapeJson(file.getName()), file.length()));
            if (i < hostedFiles.size() - 1) {
                json.append(",");
            }
        }
        json.append("]");

        headers.add("Content-Type", "application/json");
        sendResponse(exchange, 200, json.toString());
    }

    private void handleDownloadHosted(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);

        // CORS
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "GET, OPTIONS");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 200, "OK");
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        String filename = queryParams(exchange.getRequestURI()).get("filename");
        if (filename == null) {
            sendResponse(exchange, 400, "Missing filename");
            return;
        }

        java.io.File targetFile = hostedFiles.stream()
                .filter(f -> f.getName().equals(filename))
                .findFirst()
                .orElse(null);

        if (targetFile == null || !targetFile.exists()) {
            sendResponse(exchange, 404, "File not found or not hosted");
            return;
        }

        headers.add("Content-Type", "application/octet-stream");
        headers.add("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        exchange.sendResponseHeaders(200, targetFile.length());
        try (OutputStream os = exchange.getResponseBody()) {
            Files.copy(targetFile.toPath(), os);
        }
    }

    private void handleMirrorStart(HttpExchange exchange) throws IOException {
        notifyClientConnected(exchange);

        // CORS
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "POST, OPTIONS");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 200, "OK");
            return;
        }

        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "Method Not Allowed");
            return;
        }

        // Launch Mirror Window on JavaFX Thread
        System.out.println("[Mirror] Received mirror start request");

        javafx.application.Platform.runLater(() -> {
            try {
                System.out.println("[Mirror] Opening mirror window...");
                javafx.fxml.FXMLLoader loader = new javafx.fxml.FXMLLoader(
                        getClass().getResource("/MirrorDisplay.fxml"));

                if (loader.getLocation() == null) {
                    System.err.println("[Mirror] ERROR: MirrorDisplay.fxml not found!");
                    return;
                }

                javafx.scene.Parent root = loader.load();
                javafx.scene.Scene scene = new javafx.scene.Scene(root);
                javafx.stage.Stage stage = new javafx.stage.Stage();
                stage.setTitle("AirBamin Mirror");
                stage.setScene(scene);
                stage.show();
                System.out.println("[Mirror] Mirror window opened successfully!");
            } catch (Exception e) {
                System.err.println("[Mirror] ERROR opening mirror window:");
                e.printStackTrace();
            }
        });

        sendResponse(exchange, 200, "Mirroring started");
    }

    private String escapeJson(String input) {
        return input.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private Map<String, String> queryParams(URI uri) {
        Map<String, String> result = new ConcurrentHashMap<>();
        String raw = uri.getRawQuery();
        if (raw == null || raw.isEmpty()) {
            return result;
        }
        String[] pairs = raw.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf('=');
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String value = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                result.put(key, value);
            }
        }
        return result;
    }

    private void sendHtml(HttpExchange exchange, String html) throws IOException {
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        Headers headers = exchange.getResponseHeaders();
        headers.add("Content-Type", "text/html; charset=UTF-8");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendResponse(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private volatile String lastConnectedIp;

    public String getLastConnectedIp() {
        return lastConnectedIp;
    }

    private void notifyClientConnected(HttpExchange exchange) {
        String remote = remoteAddress(exchange);
        this.lastConnectedIp = remote;
        for (ServerListener listener : listeners) {
            try {
                listener.onClientConnected(remote);
            } catch (Exception ignored) {
            }
        }
    }

    private void notifyUploadStarted(HttpExchange exchange, String filename) {
        String remote = remoteAddress(exchange);
        for (ServerListener listener : listeners) {
            try {
                listener.onUploadStarted(filename, remote);
            } catch (Exception ignored) {
            }
        }
    }

    private void notifyUploadCompleted(HttpExchange exchange, TransferService.FileRecord record) {
        String remote = remoteAddress(exchange);
        for (ServerListener listener : listeners) {
            try {
                listener.onUploadCompleted(record, remote);
            } catch (Exception ignored) {
            }
        }
    }

    private void notifyBatchCompleted(HttpExchange exchange, String batchId) {
        String remote = remoteAddress(exchange);
        for (ServerListener listener : listeners) {
            try {
                listener.onBatchCompleted(batchId, remote);
            } catch (Exception ignored) {
            }
        }
    }

    private void handleDisconnect(HttpExchange exchange) throws IOException {
        // CORS
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Methods", "POST, OPTIONS");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendResponse(exchange, 200, "OK");
            return;
        }

        this.lastConnectedIp = null;
        notifyClientDisconnected();
        sendResponse(exchange, 200, "Disconnected");
    }

    private void notifyClientDisconnected() {
        for (ServerListener listener : listeners) {
            try {
                listener.onClientDisconnected();
            } catch (Exception ignored) {
            }
        }
    }

    private String remoteAddress(HttpExchange exchange) {
        try {
            InetSocketAddress address = exchange.getRemoteAddress();
            if (address == null) {
                return "phone";
            }
            InetAddress inet = address.getAddress();
            if (inet != null) {
                return inet.getHostAddress();
            }
            return address.toString();
        } catch (Exception e) {
            return "phone";
        }
    }

    private String escape(String input) {
        return input.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String urlEncode(String input) {
        return java.net.URLEncoder.encode(input, StandardCharsets.UTF_8);
    }

    public void addListener(ServerListener listener) {
        if (listener != null) {
            listeners.addIfAbsent(listener);
        }
    }

    public void removeListener(ServerListener listener) {
        if (listener != null) {
            listeners.remove(listener);
        }
    }

    private void notifyUploadProgress(HttpExchange exchange, String filename, long totalBytes, long readBytes) {
        if (totalBytes <= 0) {
            return;
        }
        double percent = Math.min(100.0, (readBytes * 100.0) / totalBytes);
        String remote = remoteAddress(exchange);
        for (ServerListener listener : listeners) {
            try {
                listener.onUploadProgress(filename, remote, percent);
            } catch (Exception ignored) {
            }
        }
    }

    private InputStream wrapWithProgress(HttpExchange exchange,
            String filename,
            long totalBytes,
            InputStream original) {
        if (totalBytes <= 0) {
            return original;
        }
        return new FilterInputStream(original) {
            private long bytesRead;

            @Override
            public int read() throws IOException {
                int value = super.read();
                if (value >= 0) {
                    bytesRead++;
                    notifyUploadProgress(exchange, filename, totalBytes, bytesRead);
                }
                return value;
            }

            @Override
            public int read(byte[] b, int off, int len) throws IOException {
                int read = super.read(b, off, len);
                if (read > 0) {
                    bytesRead += read;
                    notifyUploadProgress(exchange, filename, totalBytes, bytesRead);
                }
                return read;
            }
        };
    }

    private long readContentLength(HttpExchange exchange) {
        try {
            String header = exchange.getRequestHeaders().getFirst("Content-length");
            if (header == null) {
                header = exchange.getRequestHeaders().getFirst("Content-Length");
            }
            if (header != null) {
                return Long.parseLong(header.trim());
            }
        } catch (NumberFormatException ignored) {
        }
        return -1;
    }

    private int parseInt(String value, int defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }

    public interface ServerListener {
        default void onClientConnected(String remoteIp) {
        }

        default void onUploadStarted(String filename, String remoteIp) {
        }

        default void onUploadCompleted(TransferService.FileRecord record, String remoteIp) {
        }

        default void onUploadProgress(String filename, String remoteIp, double percent) {
        }

        default void onBatchCompleted(String batchId, String remoteIp) {
        }

        default void onClientDisconnected() {
        }
    }
}
