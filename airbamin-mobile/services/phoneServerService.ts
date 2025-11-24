import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { SelectedFile } from './fileService';

interface SessionData {
    code: string;
    files: SelectedFile[];
    createdAt: number;
    expiresAt: number;
}

class PhoneServerService {
    private isRunning: boolean = false;
    private session: SessionData | null = null;
    private port: number = 8080;

    // Start hosting files with a session code
    async startHosting(sessionCode: string, files: SelectedFile[]): Promise<boolean> {
        try {
            this.session = {
                code: sessionCode,
                files: files,
                createdAt: Date.now(),
                expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
            };

            this.isRunning = true;
            console.log(`Started hosting with code: ${sessionCode}`);
            console.log(`Hosting ${files.length} files`);

            return true;
        } catch (error) {
            console.error('Failed to start hosting:', error);
            return false;
        }
    }

    // Stop hosting
    stopHosting(): void {
        this.isRunning = false;
        this.session = null;
        console.log('Stopped hosting');
    }

    // Check if currently hosting
    isHosting(): boolean {
        return this.isRunning && this.session !== null;
    }

    // Get current session
    getSession(): SessionData | null {
        return this.session;
    }

    // Connect to a host using connection data (IP:PORT:CODE)
    async connectToHost(connectionData: string): Promise<{ success: boolean; hostIP?: string; files?: SelectedFile[] }> {
        try {
            const parsed = this.parseConnectionData(connectionData);
            if (!parsed) {
                return { success: false };
            }

            console.log(`Connecting to host: ${parsed.ip}:${parsed.port}`);

            // Try to fetch files from host
            const files = await this.getHostedFiles(parsed.ip);

            if (files.length > 0) {
                return {
                    success: true,
                    hostIP: parsed.ip,
                    files: files
                };
            }

            return { success: false };
        } catch (error) {
            console.error('Failed to connect to host:', error);
            return { success: false };
        }
    }

    // Download a file from host phone
    async downloadFile(
        hostIP: string,
        fileName: string,
        onProgress: (progress: number) => void
    ): Promise<string | null> {
        try {
            const url = `http://${hostIP}:${this.port}/download/${encodeURIComponent(fileName)}`;
            const fileUri = FileSystem.cacheDirectory + fileName;

            console.log(`Downloading from: ${url}`);

            const downloadResumable = FileSystem.createDownloadResumable(
                url,
                fileUri,
                {},
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress * 100);
                }
            );

            const result = await downloadResumable.downloadAsync();

            if (result && result.uri) {
                return result.uri;
            }

            return null;
        } catch (error) {
            console.error('Download failed:', error);
            return null;
        }
    }

    // Get list of files from host
    async getHostedFiles(hostIP: string): Promise<SelectedFile[]> {
        try {
            const url = `http://${hostIP}:${this.port}/files`;
            console.log(`Fetching files from: ${url}`);

            const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }

            const files = await response.json();
            return files;
        } catch (error) {
            console.error('Failed to get hosted files:', error);
            return [];
        }
    }

    // Get local IP address
    async getLocalIP(): Promise<string | null> {
        try {
            const { getNetworkStateAsync } = await import('expo-network');
            const networkState = await getNetworkStateAsync();

            // For simplicity, return a placeholder
            // In real implementation, would need proper IP detection
            return networkState.type === 'WIFI' ? '192.168.1.XXX' : null;
        } catch (error) {
            console.error('Failed to get local IP:', error);
            return null;
        }
    }

    // Generate connection data for QR code
    async getConnectionData(): Promise<string | null> {
        const ip = await this.getLocalIP();
        if (!ip || !this.session) {
            return null;
        }

        // Format: IP:PORT:CODE
        return `${ip}:${this.port}:${this.session.code}`;
    }

    // Parse connection data from QR/manual entry
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
}

export default new PhoneServerService();
