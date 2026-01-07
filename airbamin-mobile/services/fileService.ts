import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export interface SelectedFile {
    uri: string;
    name: string;
    size: number;
    type: string;
}

class FileService {
    /**
     * Request permissions for camera and photos
     */
    async requestPermissions(): Promise<boolean> {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return status === 'granted';
    }

    /**
     * Pick images from gallery
     */
    async pickImages(allowMultiple: boolean = true): Promise<SelectedFile[]> {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: allowMultiple,
                quality: 1,
            });

            if (!result.canceled && result.assets) {
                return result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.fileName || this.getFileNameFromUri(asset.uri),
                    size: asset.fileSize || 0,
                    type: 'image',
                }));
            }

            return [];
        } catch (error) {
            console.error('Error picking images:', error);
            return [];
        }
    }

    /**
     * Pick videos from gallery
     */
    async pickVideos(allowMultiple: boolean = true): Promise<SelectedFile[]> {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsMultipleSelection: allowMultiple,
            });

            if (!result.canceled && result.assets) {
                return result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.fileName || this.getFileNameFromUri(asset.uri),
                    size: asset.fileSize || 0,
                    type: 'video',
                }));
            }

            return [];
        } catch (error) {
            console.error('Error picking videos:', error);
            return [];
        }
    }

    /**
     * Pick documents
     */
    async pickDocuments(allowMultiple: boolean = true): Promise<SelectedFile[]> {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: allowMultiple,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets) {
                return result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.name,
                    size: asset.size || 0,
                    type: 'document',
                }));
            }

            return [];
        } catch (error) {
            console.error('Error picking documents:', error);
            return [];
        }
    }

    /**
     * Pick all file types
     */
    async pickAllFiles(allowMultiple: boolean = true): Promise<SelectedFile[]> {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsMultipleSelection: allowMultiple,
                quality: 1,
            });

            if (!result.canceled && result.assets) {
                return result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.fileName || this.getFileNameFromUri(asset.uri),
                    size: asset.fileSize || 0,
                    type: asset.type || 'unknown',
                }));
            }

            return [];
        } catch (error) {
            console.error('Error picking files:', error);
            return [];
        }
    }

    /**
     * Extract filename from URI
     */
    private getFileNameFromUri(uri: string): string {
        const parts = uri.split('/');
        const filename = parts[parts.length - 1];

        // If no extension, add .jpg as default for images
        if (!filename.includes('.')) {
            return `${filename}.jpg`;
        }

        return filename;
    }

    /**
     * Format file size to human readable
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

export default new FileService();
