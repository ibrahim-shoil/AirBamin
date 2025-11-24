import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';

export interface ConnectionInfo {
    ipAddress: string;
    port: number;
    isConnected: boolean;
}

class NetworkService {
    private baseUrl: string = '';
    private isConnected: boolean = false;

    /**
     * Test connection to desktop app
     */
    async testConnection(ipAddress: string): Promise<boolean> {
        try {
            // Normalize URL - remove trailing slash
            let url = ipAddress.startsWith('http') ? ipAddress : `http://${ipAddress}`;
            url = url.replace(/\/+$/, ''); // Remove trailing slashes
            this.baseUrl = url;

            console.log('Testing connection to:', `${url}/ping`);

            // Try to ping the desktop server
            const response = await axios.get(`${url}/ping`, {
                timeout: 5000,
            });

            console.log('Ping response:', response.status, response.data);
            this.isConnected = response.status === 200;
            return this.isConnected;
        } catch (error) {
            console.error('Connection test failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Upload a single file to desktop
     */
    async uploadFile(
        fileUri: string,
        fileName: string,
        onProgress?: (progress: number) => void
    ): Promise<boolean> {
        if (!this.isConnected) {
            console.error('Cannot upload: Not connected to desktop');
            throw new Error('Not connected to desktop app');
        }

        try {
            console.log('=== Starting file upload ===');
            console.log('File name:', fileName);
            console.log('File URI:', fileUri);
            console.log('Base URL:', this.baseUrl);

            const uploadUrl = `${this.baseUrl}/upload?filename=${encodeURIComponent(fileName)}`;
            console.log('Upload URL:', uploadUrl);

            // Check if file exists
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            console.log('File info:', fileInfo);

            if (!fileInfo.exists) {
                console.error('File does not exist at URI:', fileUri);
                return false;
            }

            console.log('File size:', fileInfo.size, 'bytes');
            console.log('Starting upload...');

            // Use createUploadTask for progress tracking
            const task = FileSystem.createUploadTask(
                uploadUrl,
                fileUri,
                {
                    httpMethod: 'POST',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                },
                (data) => {
                    if (onProgress) {
                        const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
                        onProgress(progress * 100);
                    }
                }
            );

            const uploadResult = await task.uploadAsync();

            console.log('Upload complete!');
            if (uploadResult) {
                console.log('Status:', uploadResult.status);
                console.log('Response:', uploadResult.body);
                return uploadResult.status === 200;
            }
            return false;
        } catch (error) {
            console.error('=== Upload failed ===');
            console.error('Error:', error);
            return false;
        }
    }

    /**
     * Upload multiple files
     */
    async uploadFiles(
        files: Array<{ uri: string; name: string }>,
        onProgress?: (current: number, total: number, fileProgress: number) => void
    ): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const uploaded = await this.uploadFile(
                file.uri,
                file.name,
                (progress) => {
                    if (onProgress) {
                        onProgress(i + 1, files.length, progress);
                    }
                }
            );

            if (uploaded) {
                success++;
            } else {
                failed++;
            }
        }

        return { success, failed };
    }

    /**
     * Get list of files hosted by desktop
     */
    async getHostedFiles(): Promise<Array<{ name: string; size: number }>> {
        if (!this.isConnected) return [];
        try {
            const response = await axios.get(`${this.baseUrl}/api/files/list-hosted`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch hosted files:', error);
            return [];
        }
    }

    /**
     * Download a file from desktop
     */
    async downloadHostedFile(
        filename: string,
        onProgress?: (progress: number) => void
    ): Promise<string | null> {
        if (!this.isConnected) return null;

        try {
            const downloadUrl = `${this.baseUrl}/api/files/download-hosted?filename=${encodeURIComponent(filename)}`;
            const fileUri = FileSystem.documentDirectory + filename;

            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri,
                {},
                (downloadProgress) => {
                    if (onProgress) {
                        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        onProgress(progress * 100);
                    }
                }
            );

            const result = await downloadResumable.downloadAsync();
            return result ? result.uri : null;
        } catch (error) {
            console.error('Download failed:', error);
            return null;
        }
    }

    /**
     * Get MIME type from filename
     */
    public getMimeType(filename: string): string {
        const extension = filename.split('.').pop()?.toLowerCase();

        const mimeTypes: { [key: string]: string } = {
            // Images
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            heic: 'image/heic',

            // Videos
            mp4: 'video/mp4',
            mov: 'video/quicktime',
            avi: 'video/x-msvideo',

            // Documents
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            txt: 'text/plain',

            // Default
            default: 'application/octet-stream',
        };

        return mimeTypes[extension || 'default'] || mimeTypes.default;
    }

    /**
     * Get current connection status
     */
    getConnectionStatus(): ConnectionInfo {
        return {
            ipAddress: this.baseUrl,
            port: 9099,
            isConnected: this.isConnected,
        };
    }

    /**
     * Disconnect from desktop
     */
    disconnect() {
        this.isConnected = false;
        this.baseUrl = '';
    }
}

export default new NetworkService();
