import * as FileSystem from 'expo-file-system/legacy';
import { SelectedFile } from './fileService';
import * as Network from 'expo-network';
//@ts-ignore
import httpBridge from 'react-native-http-bridge';
import { NativeEventEmitter, NativeModules } from 'react-native';

interface SessionData {
    code: string;
    files: SelectedFile[];
    createdAt: number;
    expiresAt: number;
}

class PhoneServerService {
    private isRunning: boolean = false;
    private session: SessionData | null = null;
    private httpServer: any = null;
    private port: number = 8095;
    private serverRoot: string = '';
    private eventSubscription: any = null;
    private receivedFiles: Array<{name: string; size: number; uri: string}> = [];  // Files received from connected device
    private onFilesReceivedCallback: ((files: any[]) => void) | null = null;

    async startHosting(sessionCode: string, files: SelectedFile[]): Promise<{ success: boolean; error?: string }> {
        try {
            console.log(`📱 Starting HTTP hosting for ${files.length} files with code: ${sessionCode}`);

            this.session = {
                code: sessionCode,
                files: files,
                createdAt: Date.now(),
                expiresAt: Date.now() + (30 * 60 * 1000),
            };

            // Create server directory
            this.serverRoot = FileSystem.cacheDirectory + 'phone_server/';
            console.log(`📂 Server root URI: ${this.serverRoot}`);

            // Clean and recreate directory
            try {
                await FileSystem.deleteAsync(this.serverRoot, { idempotent: true });
            } catch (e) {
                // Ignore if doesn't exist
            }
            await FileSystem.makeDirectoryAsync(this.serverRoot, { intermediates: true });

            // Copy files to server directory
            console.log(`📁 Copying ${files.length} files to server directory...`);
            for (const file of files) {
                const destPath = this.serverRoot + file.name;
                await FileSystem.copyAsync({
                    from: file.uri,
                    to: destPath
                });
                console.log(`✅ Copied: ${file.name}`);
            }

            // Create metadata
            const metadata = {
                code: sessionCode,
                files: files.map(f => ({ name: f.name, size: f.size })),
                timestamp: Date.now()
            };
            const metadataJson = JSON.stringify(metadata, null, 2);
            const metadataPath = this.serverRoot + 'metadata.json';
            await FileSystem.writeAsStringAsync(metadataPath, metadataJson);
            console.log(`📋 Metadata saved to: ${metadataPath}`);

            // Verify files
            const dirContents = await FileSystem.readDirectoryAsync(this.serverRoot);
            console.log(`📂 Server directory contents:`, dirContents);

            // Start HTTP Bridge server
            console.log(`🚀 Starting HTTP Bridge server on port ${this.port}...`);
            httpBridge.start(this.port, 'http_service', async (request: any) => {
                try {
                    const url = request.url;
                    console.log(`📥 HTTP Request: ${request.type} ${url}`);

                    // Handle metadata.json request
                    if (url === '/metadata.json' || url === '/metadata.json/') {
                        console.log(`📋 Serving metadata.json`);
                        // Include both hosted files and received files
                        const fullMetadata = {
                            ...JSON.parse(metadataJson),
                            receivedFiles: this.receivedFiles
                        };
                        httpBridge.respond(request.requestId, 200, 'application/json', JSON.stringify(fullMetadata));
                        return;
                    }

                    // Handle file upload from connected device (POST /upload)
                    if (url === '/upload' && request.type === 'POST') {
                        console.log(`📤 Receiving file upload from connected device`);
                        try {
                            const body = JSON.parse(request.postData || '{}');
                            const { fileName, fileData, fileSize } = body;
                            
                            if (!fileName || !fileData) {
                                httpBridge.respond(request.requestId, 400, 'application/json', JSON.stringify({ error: 'Missing fileName or fileData' }));
                                return;
                            }
                            
                            // Save the file to server directory
                            const receivedDir = this.serverRoot + 'received/';
                            await FileSystem.makeDirectoryAsync(receivedDir, { intermediates: true });
                            const filePath = receivedDir + fileName;
                            
                            await FileSystem.writeAsStringAsync(filePath, fileData, {
                                encoding: FileSystem.EncodingType.Base64
                            });
                            
                            // Add to received files list
                            const fileInfo = { name: fileName, size: fileSize || 0, uri: filePath };
                            this.receivedFiles.push(fileInfo);
                            console.log(`✅ Received file: ${fileName} (${fileSize} bytes)`);
                            
                            // Notify callback if set
                            if (this.onFilesReceivedCallback) {
                                this.onFilesReceivedCallback([...this.receivedFiles]);
                            }
                            
                            httpBridge.respond(request.requestId, 200, 'application/json', JSON.stringify({ success: true, file: fileInfo }));
                        } catch (uploadErr: any) {
                            console.error(`❌ Upload error: ${uploadErr.message}`);
                            httpBridge.respond(request.requestId, 500, 'application/json', JSON.stringify({ error: uploadErr.message }));
                        }
                        return;
                    }

                    // Handle file requests
                    const fileName = url.startsWith('/') ? url.substring(1) : url;
                    const filePath = this.serverRoot + fileName;

                    try {
                        const fileInfo = await FileSystem.getInfoAsync(filePath);
                        if (fileInfo.exists && !fileInfo.isDirectory) {
                            // Read file as base64 and serve
                            const fileContent = await FileSystem.readAsStringAsync(filePath, {
                                encoding: FileSystem.EncodingType.Base64
                            });

                            // Determine content type
                            const ext = fileName.split('.').pop()?.toLowerCase() || '';
                            const contentTypes: { [key: string]: string } = {
                                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                                'gif': 'image/gif', 'webp': 'image/webp', 'mp4': 'video/mp4',
                                'mov': 'video/quicktime', 'pdf': 'application/pdf',
                                'json': 'application/json', 'html': 'text/html'
                            };
                            const contentType = contentTypes[ext] || 'application/octet-stream';

                            console.log(`📤 Serving file: ${fileName} (${contentType})`);
                            // HTTP Bridge only supports text responses, so send base64
                            httpBridge.respond(request.requestId, 200, contentType + ';base64', fileContent);
                        } else {
                            console.log(`❌ File not found: ${fileName}`);
                            httpBridge.respond(request.requestId, 404, 'text/plain', 'File not found');
                        }
                    } catch (fileErr: any) {
                        console.error(`❌ Error reading file: ${fileErr.message}`);
                        httpBridge.respond(request.requestId, 500, 'text/plain', 'Error reading file');
                    }
                } catch (err: any) {
                    console.error('❌ Request handler error:', err);
                    httpBridge.respond(request.requestId, 500, 'text/plain', 'Server error');
                }
            });

            console.log(`✅ HTTP Bridge Server started on port ${this.port}`);

            // Perform self-check after a short delay
            this.performSelfCheck();

            this.isRunning = true;

            return { success: true };
        } catch (error: any) {
            console.error('Failed to start HTTP hosting:', error);
            console.error('Error details:', JSON.stringify({ name: error.name, message: error.message }));
            // Try to stop if partially started
            try {
                httpBridge.stop();
            } catch (e) { }
            return { success: false, error: error.message };
        }
    }

    private async performSelfCheck() {
        // Wait longer for the server to be fully ready (httpBridge needs time)
        console.log(`⏳ Waiting 3 seconds for HTTP Bridge server to be ready...`);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const localIP = await this.getLocalIP();
        console.log(`🔍 Self-check starting. Local IP: ${localIP}`);

        // Try localhost first - it should always work if server is up
        try {
            console.log(`🔄 [1/2] Testing localhost: http://127.0.0.1:${this.port}/metadata.json`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const check = await fetch(`http://127.0.0.1:${this.port}/metadata.json`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (check.ok) {
                const data = await check.text();
                console.log('✅ [1/2] Localhost check PASSED: Server responding!');
                console.log(`📄 Response length: ${data.length} chars`);
            } else {
                console.warn('⚠️ [1/2] Localhost check FAILED: Status', check.status);
            }
        } catch (checkErr: any) {
            console.warn('❌ [1/2] Localhost check FAILED:', checkErr.message);
        }

        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now try external IP - this is the critical test for cross-device access
        if (localIP) {
            try {
                console.log(`🔄 [2/2] Testing external IP: http://${localIP}:${this.port}/metadata.json`);
                console.log(`📡 If this fails, the server is NOT binding to 0.0.0.0`);

                const controller2 = new AbortController();
                const timeoutId2 = setTimeout(() => controller2.abort(), 10000); // 10s timeout

                const externalCheck = await fetch(`http://${localIP}:${this.port}/metadata.json`, {
                    signal: controller2.signal
                });

                clearTimeout(timeoutId2);

                if (externalCheck.ok) {
                    console.log('✅ [2/2] External IP check PASSED! Server is accessible from other devices!');
                    console.log('🎉 iPhone should be able to connect to Android now!');
                } else {
                    console.warn('⚠️ [2/2] External IP check FAILED: Status', externalCheck.status);
                }
            } catch (externalErr: any) {
                console.error('❌ [2/2] External IP check FAILED:', externalErr.message);
                console.error('🚨 Server may not be binding to 0.0.0.0 or port may be blocked');
            }
        }
    }

    async stopHosting(): Promise<void> {
        try {
            if (httpBridge && httpBridge.stop) {
                httpBridge.stop();
                console.log('HTTP Bridge server stopped');
            }
        } catch (e) {
            console.error('Error stopping HTTP Bridge server:', e);
        }

        // Clean up server directory
        if (this.serverRoot) {
            try {
                await FileSystem.deleteAsync(this.serverRoot, { idempotent: true });
            } catch (e) {
                console.error('Error cleaning server directory:', e);
            }
        }

        this.isRunning = false;
        this.session = null;
        this.receivedFiles = [];  // Clear received files
        console.log('Stopped hosting');
    }

    // Set callback for when files are received from connected device
    onFilesReceived(callback: (files: any[]) => void) {
        this.onFilesReceivedCallback = callback;
    }

    // Get files received from connected device
    getReceivedFiles(): Array<{name: string; size: number; uri: string}> {
        return [...this.receivedFiles];
    }

    isHosting(): boolean {
        return this.isRunning && this.session !== null;
    }

    getSession(): SessionData | null {
        return this.session;
    }

    async connectToHost(connectionData: string): Promise<{ success: boolean; hostIP?: string; files?: any[]; error?: string }> {
        const parsed = this.parseConnectionData(connectionData);
        if (!parsed) {
            return { success: false, error: 'Invalid connection format' };
        }

        try {
            let targetIP = parsed.ip.trim();
            const localIP = (await this.getLocalIP())?.trim();

            console.log(`🔍 IP Check - Target: '${targetIP}', Local: '${localIP}'`);

            // If connecting to self, use localhost to avoid Android loopback issues
            if (localIP && targetIP === localIP) {
                console.log('🔄 Connecting to self, switching to localhost');
                targetIP = '127.0.0.1';
            }

            // Try HTTP metadata endpoint with timeout
            const metadataUrl = `http://${targetIP}:${parsed.port}/metadata.json`;
            console.log(`📞 Fetching metadata from: ${metadataUrl}`);
            console.log(`⏰ Start time: ${new Date().toISOString()}`);

            // Add 30 second timeout (increased for slow local network connections)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log(`⏰ Timeout triggered at: ${new Date().toISOString()}`);
                controller.abort();
            }, 30000);

            try {
                console.log(`🌐 Attempting fetch...`);
                const response = await fetch(metadataUrl, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                console.log(`✅ Fetch completed! Status: ${response.status}`);

                if (!response.ok) {
                    return { success: false, error: `Failed to fetch metadata: ${response.status}` };
                }

                const metadata = await response.json();
                console.log(`📋 Metadata received:`, JSON.stringify(metadata).substring(0, 200));

                if (metadata.code === parsed.code) {
                    console.log('✅ Code verified!');
                    return { success: true, hostIP: targetIP, files: metadata.files };
                } else {
                    console.log(`❌ Code mismatch: expected ${parsed.code}, got ${metadata.code}`);
                    return { success: false, error: 'Invalid code' };
                }
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                console.error(`❌ Fetch error: ${fetchError.name} - ${fetchError.message}`);
                throw fetchError;
            }
        } catch (error: any) {
            console.error('Connection error:', error);
            console.error('Error details:', JSON.stringify({ name: error.name, message: error.message, stack: error.stack?.substring(0, 300) }));
            if (error.name === 'AbortError') {
                return { success: false, error: 'Connection timed out (10s). Make sure both devices are on the same WiFi and Android firewall allows connections.' };
            }
            return { success: false, error: error.message || 'Connection failed' };
        }
    }

    async downloadFile(
        hostIP: string,
        fileName: string,
        onProgress: (progress: number) => void,
        expectedSize?: number  // Expected file size from metadata
    ): Promise<string | null> {
        try {
            const downloadUrl = `http://${hostIP}:${this.port}/${encodeURIComponent(fileName)}`;
            const fileUri = FileSystem.cacheDirectory + fileName;

            console.log(`📥 Downloading from: ${downloadUrl}`);
            console.log(`📊 Expected size: ${expectedSize} bytes`);

            // Show initial progress
            onProgress(5);

            // Start simulated progress animation (since fetch doesn't support progress)
            let simulatedProgress = 5;
            const progressInterval = setInterval(() => {
                if (simulatedProgress < 70) {
                    simulatedProgress += 3;
                    onProgress(simulatedProgress);
                }
            }, 500);

            // Fetch the file (may be base64 encoded from HTTP Bridge)
            const response = await fetch(downloadUrl);

            if (!response.ok) {
                clearInterval(progressInterval);
                console.error(`❌ Download failed: HTTP ${response.status}`);
                return null;
            }

            const contentType = response.headers.get('Content-Type') || '';
            console.log(`📄 Content-Type: ${contentType}`);

            // Check if response is base64 encoded (from HTTP Bridge)
            if (contentType.includes(';base64')) {
                // Response body is base64
                const base64Content = await response.text();
                clearInterval(progressInterval);
                console.log(`📦 Received base64 data: ${base64Content.length} chars`);
                onProgress(80);

                // Write base64 content to file
                await FileSystem.writeAsStringAsync(fileUri, base64Content, {
                    encoding: FileSystem.EncodingType.Base64
                });

                console.log(`✅ Downloaded (base64): ${fileName}`);
                onProgress(100);
                return fileUri;
            } else {
                // Regular binary response - use downloadResumable for progress
                clearInterval(progressInterval);
                onProgress(0);

                const downloadResumable = FileSystem.createDownloadResumable(
                    downloadUrl,
                    fileUri,
                    {},
                    (downloadProgress) => {
                        let totalBytes = downloadProgress.totalBytesExpectedToWrite;
                        if (!totalBytes || totalBytes <= 0) {
                            totalBytes = expectedSize || 0;
                        }
                        if (totalBytes > 0) {
                            const progress = (downloadProgress.totalBytesWritten / totalBytes) * 100;
                            onProgress(Math.min(99, progress));
                        } else {
                            const estimatedProgress = Math.min(90, (downloadProgress.totalBytesWritten / 5000000) * 100);
                            onProgress(Math.max(5, estimatedProgress));
                        }
                    }
                );

                const result = await downloadResumable.downloadAsync();
                if (result?.uri) {
                    console.log(`✅ Downloaded: ${fileName}`);
                    onProgress(100);
                    return result.uri;
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Download error:', error);
            return null;
        }
    }

    async discoverHost(code: string, onProgress?: (scanned: number) => void): Promise<{ success: boolean; hostIP?: string; files?: any[] }> {
        console.log('🔵 discoverHost called with code:', code);
        const localIP = await this.getLocalIP();
        console.log('🔵 Local IP detected:', localIP);

        if (!localIP) {
            console.error('🔴 Could not get local IP');
            return { success: false };
        }

        const subnet = localIP.substring(0, localIP.lastIndexOf('.') + 1);
        console.log(`🔍 Scanning subnet: ${subnet}*`);

        // Create array of all possible IPs (1-254)
        const ipsToCheck: string[] = [];
        for (let i = 1; i < 255; i++) {
            const ip = subnet + i;
            if (ip !== localIP) {
                ipsToCheck.push(ip);
            }
        }

        console.log(`🔵 IPs to check: ${ipsToCheck.length}`);

        // Process in smaller batches to avoid overwhelming the network stack (especially on iOS)
        const BATCH_SIZE = 10;

        for (let i = 0; i < ipsToCheck.length; i += BATCH_SIZE) {
            const batch = ipsToCheck.slice(i, i + BATCH_SIZE);
            console.log(`🔵 Scanning batch ${i / BATCH_SIZE + 1}: ${batch[0]} - ${batch[batch.length - 1]}`);

            // Update progress
            if (onProgress) {
                onProgress(i);
            }

            const promises = batch.map(ip => this.tryConnectHTTP(ip, code));

            // Wait for the entire batch to complete
            const results = await Promise.all(promises);
            const found = results.find(r => r !== null);

            if (found) {
                console.log(`✅ HTTP Host found: ${found.ip} with ${found.files.length} files`);
                return { success: true, hostIP: found.ip, files: found.files };
            }

            // Small delay between batches to let the network stack breathe
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log('🔴 Discovery finished, host not found');
        return { success: false };
    }

    private async tryConnectHTTP(ip: string, code: string): Promise<{ ip: string; files: any[] } | null> {
        try {
            // Shorter timeout for faster scanning
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);

            const metadataUrl = `http://${ip}:${this.port}/metadata.json`;

            const response = await fetch(metadataUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Cache-Control': 'no-cache' }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return null;
            }

            const metadata = await response.json();
            console.log(`📋 Response from ${ip}:`, metadata);

            if (metadata.code === code && Array.isArray(metadata.files)) {
                return { ip, files: metadata.files };
            }

            return null;
        } catch (error: any) {
            // Ignore errors (timeout, connection refused, etc.)
            return null;
        }
    }

    async getLocalIP(): Promise<string | null> {
        try {
            const ip = await Network.getIpAddressAsync();
            return ip;
        } catch (error) {
            console.error('Failed to get local IP:', error);
            return null;
        }
    }

    async getConnectionData(): Promise<string | null> {
        const ip = await this.getLocalIP();
        if (!ip || !this.session) {
            return null;
        }
        return `${ip}:${this.port}:${this.session.code}`;
    }

    parseConnectionData(data: string): { ip: string; port: number; code: string } | null {
        try {
            const parts = data.split(':');
            if (parts.length !== 3) return null;
            return {
                ip: parts[0],
                port: parseInt(parts[1]),
                code: parts[2]
            };
        } catch {
            return null;
        }
    }

    // Upload a file to the host (used by receiver to send files back)
    async uploadToHost(
        hostIP: string,
        file: { name: string; uri: string; size: number },
        onProgress: (progress: number) => void
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log(`📤 Uploading ${file.name} to host ${hostIP}...`);
            onProgress(5);

            // Read file as base64
            const fileData = await FileSystem.readAsStringAsync(file.uri, {
                encoding: FileSystem.EncodingType.Base64
            });
            onProgress(30);

            console.log(`📦 File read, size: ${fileData.length} chars (base64)`);

            // Upload to host's /upload endpoint
            const uploadUrl = `http://${hostIP}:${this.port}/upload`;
            console.log(`📞 POSTing to: ${uploadUrl}`);

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileData: fileData,
                    fileSize: file.size
                })
            });

            onProgress(90);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Upload failed: ${response.status} - ${errorText}`);
                return { success: false, error: `Upload failed: ${response.status}` };
            }

            const result = await response.json();
            console.log(`✅ Upload complete:`, result);
            onProgress(100);

            return { success: true };
        } catch (error: any) {
            console.error('❌ Upload error:', error);
            return { success: false, error: error.message || 'Upload failed' };
        }
    }
}

export default new PhoneServerService();
