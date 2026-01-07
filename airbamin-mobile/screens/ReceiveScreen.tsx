import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import Icon from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import { useConnection } from '../contexts/ConnectionContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import phoneServerService from '../services/phoneServerService';
import fileService, { SelectedFile } from '../services/fileService';

const STORAGE_KEY_DOWNLOAD_FOLDER = 'download_folder_uri';

type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>;

interface HostedFile {
    name: string;
    size: number;
    uri?: string; // Added for phone transfer
}

export default function ReceiveScreen({ navigation, route }: Props) {
    const { colors, isDark, language } = useTheme();
    const { isConnected, connectedIP } = useConnection();
    const styles = getStyles(colors, isDark, language);

    // Params from phone transfer
    const { hostIP, isPhoneTransfer, phoneFiles } = route.params || {};

    const [files, setFiles] = useState<HostedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [downloadFolder, setDownloadFolder] = useState<string | null>(null);

    // Upload state for sending files back to host
    const [filesToSend, setFilesToSend] = useState<SelectedFile[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (!isConnected && !isPhoneTransfer) {
            Alert.alert(i18n.t('error'), 'Please connect to PC first');
            navigation.goBack();
            return;
        }

        // If phoneFiles are already provided (from phone transfer), use them directly
        if (phoneFiles && phoneFiles.length > 0) {
            console.log('📱 Using provided phone files:', phoneFiles);
            setFiles(phoneFiles);
            setLoading(false);
            loadDownloadFolder();
            // No need to poll - files are already here!
        } else {
            fetchFiles(true);
            loadDownloadFolder();
            // Only poll if we're fetching from PC
            const interval = setInterval(() => fetchFiles(false), 4000);
            return () => clearInterval(interval);
        }
    }, [isConnected, isPhoneTransfer]);

    const loadDownloadFolder = async () => {
        try {
            const uri = await AsyncStorage.getItem(STORAGE_KEY_DOWNLOAD_FOLDER);
            if (uri) {
                setDownloadFolder(uri);
            }
        } catch (e) {
            console.error('Failed to load download folder', e);
        }
    };

    const fetchFiles = async (isInitial = false) => {
        const targetIP = isPhoneTransfer ? hostIP : connectedIP;
        if (!targetIP) return;

        if (isInitial) setLoading(true);
        try {
            // Phone files come from navigation params, not from fetching
            if (!isPhoneTransfer) {
                const baseUrl = `http://${targetIP}`;
                const response = await fetch(`${baseUrl}/api/files/list-hosted`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }
                const fileList = await response.json();
                setFiles(fileList);
            }
        } catch (error) {
            console.log('[RECEIVE] Error fetching files:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // Select files to send back to host
    const handleSelectFilesToSend = async () => {
        try {
            const selectedFiles = await fileService.pickAllFiles();
            if (selectedFiles.length > 0) {
                setFilesToSend(prev => [...prev, ...selectedFiles]);
            }
        } catch (error) {
            console.error('File selection error:', error);
        }
    };

    // Upload selected files to host
    const handleUploadToHost = async () => {
        if (!hostIP || filesToSend.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        for (const file of filesToSend) {
            setUploading(file.name);
            setUploadProgress(0);

            const result = await phoneServerService.uploadToHost(hostIP, file, setUploadProgress);

            if (result.success) {
                successCount++;
            } else {
                failCount++;
                console.error(`Failed to upload ${file.name}:`, result.error);
            }
        }

        setUploading(null);
        setFilesToSend([]);  // Clear sent files

        Alert.alert(
            i18n.t('complete'),
            `${i18n.t('success')}: ${successCount}, ${i18n.t('failed')}: ${failCount}`
        );
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getMimeType = (filename: string): string => {
        const extension = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: { [key: string]: string } = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            mp4: 'video/mp4',
            txt: 'text/plain',
        };
        return mimeTypes[extension || 'default'] || 'application/octet-stream';
    };

    const selectDownloadFolder = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert(i18n.t('info'), i18n.t('ios_folder_select_msg'));
            return;
        }

        try {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const uri = permissions.directoryUri;
                await AsyncStorage.setItem(STORAGE_KEY_DOWNLOAD_FOLDER, uri);
                setDownloadFolder(uri);
                Alert.alert(i18n.t('success'), i18n.t('folder_selected'));
            }
        } catch (e) {
            console.error(e);
            Alert.alert(i18n.t('error'), i18n.t('folder_select_failed'));
        }
    };

    const shareFile = async (uri: string) => {
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        } else {
            Alert.alert(i18n.t('error'), i18n.t('sharing_not_available'));
        }
    };

    const handleDownload = async (file: HostedFile) => {
        const targetIP = isPhoneTransfer ? hostIP : connectedIP;
        if (!targetIP) return;

        setDownloading(file.name);
        setProgress(0);

        try {
            let cacheUri: string | null = null;

            if (isPhoneTransfer) {
                // Pass expected file size for better progress reporting
                cacheUri = await phoneServerService.downloadFile(targetIP, file.name, setProgress, file.size);
            } else {
                const baseUrl = `http://${targetIP}`;
                const downloadUrl = `${baseUrl}/api/files/download-hosted?filename=${encodeURIComponent(file.name)}`;
                const fileUri = FileSystem.documentDirectory + file.name;

                console.log('[RECEIVE] Downloading:', downloadUrl);

                const downloadResumable = FileSystem.createDownloadResumable(
                    downloadUrl,
                    fileUri,
                    {},
                    (downloadProgress) => {
                        const prog = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                        setProgress(prog * 100);
                    }
                );

                const result = await downloadResumable.downloadAsync();
                cacheUri = result?.uri || null;
            }

            setDownloading(null);

            if (!cacheUri) {
                Alert.alert(i18n.t('error'), i18n.t('download_failed'));
                return;
            }

            console.log('[RECEIVE] Downloaded to:', cacheUri);

            try {
                if (Platform.OS === 'android' && downloadFolder) {
                    try {
                        const content = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
                        const mimeType = getMimeType(file.name);
                        const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(downloadFolder, file.name, mimeType);
                        await FileSystem.writeAsStringAsync(newFileUri, content, { encoding: FileSystem.EncodingType.Base64 });
                        Alert.alert(i18n.t('success'), `${i18n.t('saved_to')} ${decodeURIComponent(downloadFolder).split('%3A').pop()}`);
                        await FileSystem.deleteAsync(cacheUri, { idempotent: true });
                    } catch (e) {
                        console.error('SAF Save Error:', e);
                        shareFile(cacheUri);
                    }
                } else {
                    shareFile(cacheUri);
                }
            } catch (e) {
                console.error('Save error:', e);
                Alert.alert(i18n.t('error'), i18n.t('save_failed'));
            }
        } catch (error) {
            console.error('[RECEIVE] Download error:', error);
            setDownloading(null);
            Alert.alert(i18n.t('error'), i18n.t('download_failed'));
        }
    };

    const handleDownloadAll = async () => {
        if (files.length === 0) return;

        if (Platform.OS === 'android' && !downloadFolder) {
            Alert.alert(
                i18n.t('folder_required'),
                i18n.t('folder_required_msg'),
                [
                    { text: i18n.t('cancel'), style: 'cancel' },
                    { text: i18n.t('select_folder'), onPress: selectDownloadFolder }
                ]
            );
            return;
        }

        if (Platform.OS === 'ios') {
            Alert.alert(
                i18n.t('download_all'),
                i18n.t('ios_download_all_msg'),
                [
                    { text: i18n.t('cancel'), style: 'cancel' },
                    { text: i18n.t('continue'), onPress: () => downloadAllIOS() }
                ]
            );
            return;
        }

        Alert.alert(
            i18n.t('download_all'),
            `${i18n.t('download_all_confirm')} (${files.length} ${i18n.t('files')})?`,
            [
                { text: i18n.t('cancel'), style: 'cancel' },
                { text: i18n.t('download'), onPress: () => downloadAllAndroid() }
            ]
        );
    };

    const downloadAllAndroid = async () => {
        const targetIP = isPhoneTransfer ? hostIP : connectedIP;
        if (!targetIP) return;

        let successCount = 0;
        let failCount = 0;
        const baseUrl = `http://${targetIP}`;

        for (const file of files) {
            try {
                setDownloading(file.name);
                setProgress(0);
                let cacheUri: string | null = null;

                if (isPhoneTransfer) {
                    cacheUri = await phoneServerService.downloadFile(targetIP, file.name, setProgress);
                } else {
                    const downloadUrl = `${baseUrl}/api/files/download-hosted?filename=${encodeURIComponent(file.name)}`;
                    const fileUri = FileSystem.documentDirectory + file.name;

                    const downloadResumable = FileSystem.createDownloadResumable(
                        downloadUrl,
                        fileUri,
                        {},
                        (p) => setProgress((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100)
                    );

                    const result = await downloadResumable.downloadAsync();
                    cacheUri = result?.uri || null;
                }

                if (!cacheUri) {
                    failCount++;
                    continue;
                }

                if (downloadFolder) {
                    try {
                        const content = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
                        const mimeType = getMimeType(file.name);
                        const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(downloadFolder, file.name, mimeType);
                        await FileSystem.writeAsStringAsync(newFileUri, content, { encoding: FileSystem.EncodingType.Base64 });
                        await FileSystem.deleteAsync(cacheUri, { idempotent: true });
                        successCount++;
                    } catch (e) {
                        console.error('SAF Save Error:', e);
                        failCount++;
                    }
                }
            } catch (e) {
                console.error(e);
                failCount++;
            }
        }

        setDownloading(null);
        const folderName = decodeURIComponent(downloadFolder || '').split('%3A').pop() || 'selected folder';
        Alert.alert(i18n.t('complete'), `${i18n.t('saved_to')} ${folderName}\n${i18n.t('success')}: ${successCount}, ${i18n.t('failed')}: ${failCount}`);
    };

    const isMediaFile = (filename: string): boolean => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const mediaExtensions = ['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif', 'bmp', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp'];
        return mediaExtensions.includes(ext);
    };

    const downloadAllIOS = async () => {
        const targetIP = isPhoneTransfer ? hostIP : connectedIP;
        if (!targetIP) return;

        // Request media library permission first
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                i18n.t('permission_required'),
                i18n.t('photos_permission_msg'),
                [{ text: 'OK' }]
            );
            return;
        }

        let successCount = 0;
        let failCount = 0;
        const baseUrl = `http://${targetIP}`;
        const nonMediaFiles: { name: string; uri: string }[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                setDownloading(file.name);
                setProgress(0);
                let cacheUri: string | null = null;

                if (isPhoneTransfer) {
                    cacheUri = await phoneServerService.downloadFile(targetIP, file.name, setProgress);
                } else {
                    const downloadUrl = `${baseUrl}/api/files/download-hosted?filename=${encodeURIComponent(file.name)}`;
                    const fileUri = FileSystem.documentDirectory + file.name;

                    const downloadResumable = FileSystem.createDownloadResumable(
                        downloadUrl,
                        fileUri,
                        {},
                        (p) => setProgress((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100)
                    );

                    const result = await downloadResumable.downloadAsync();
                    cacheUri = result?.uri || null;
                }

                if (!cacheUri) {
                    failCount++;
                    continue;
                }

                // For images/videos, save directly to Photos library
                if (isMediaFile(file.name)) {
                    try {
                        await MediaLibrary.saveToLibraryAsync(cacheUri);
                        successCount++;
                        // Clean up cache file after saving to library
                        await FileSystem.deleteAsync(cacheUri, { idempotent: true });
                    } catch (mediaError) {
                        console.error('Failed to save to Photos:', mediaError);
                        // Fallback to share sheet for this file
                        nonMediaFiles.push({ name: file.name, uri: cacheUri });
                    }
                } else {
                    // Non-media files need share sheet
                    nonMediaFiles.push({ name: file.name, uri: cacheUri });
                }
            } catch (e) {
                console.error(e);
                failCount++;
            }
        }

        setDownloading(null);

        // Handle non-media files with share sheet (one at a time)
        if (nonMediaFiles.length > 0) {
            Alert.alert(
                i18n.t('complete'),
                `${i18n.t('saved_to_photos')}: ${successCount}\n${i18n.t('other_files')}: ${nonMediaFiles.length}`,
                [{
                    text: i18n.t('save_other_files'),
                    onPress: async () => {
                        for (const nf of nonMediaFiles) {
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(nf.uri);
                            }
                        }
                    }
                }, { text: 'OK' }]
            );
        } else {
            Alert.alert(i18n.t('complete'), `${i18n.t('saved_to_photos')}: ${successCount}`);
        }
    };

    const renderItem = ({ item }: { item: HostedFile }) => (
        <View style={styles.fileItem}>
            <View style={styles.fileIcon}>
                <Icon name="file" size={24} color={colors.text} />
            </View>
            <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.fileSize}>{formatSize(item.size)}</Text>
            </View>
            <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownload(item)}
                disabled={!!downloading}
            >
                {downloading === item.name ? (
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                ) : (
                    <Icon name="download" size={20} color={colors.primary} />
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>

                <Text style={styles.title}>{i18n.t('receive_files')}</Text>

                <View style={{ flexDirection: 'row' }}>
                    {/* Send Files button - only for phone transfers */}
                    {isPhoneTransfer && (
                        <TouchableOpacity
                            onPress={handleSelectFilesToSend}
                            style={styles.iconButton}
                            disabled={!!uploading}
                        >
                            <Icon name="plus" size={20} color={uploading ? colors.textSecondary : colors.primary} />
                        </TouchableOpacity>
                    )}
                    {Platform.OS === 'android' && (
                        <TouchableOpacity onPress={selectDownloadFolder} style={styles.iconButton}>
                            <Icon name="folder" size={20} color={downloadFolder ? colors.primary : colors.text} />
                        </TouchableOpacity>
                    )}
                    {files.length > 0 && (
                        <TouchableOpacity onPress={handleDownloadAll} style={styles.iconButton} disabled={!!downloading}>
                            <Icon name="download-cloud" size={20} color={downloading ? colors.textSecondary : colors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => fetchFiles(true)} style={styles.iconButton}>
                        <Icon name="refresh-cw" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
                </View>
            ) : files.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>{i18n.t('no_files_hosted')}</Text>
                    <Text style={styles.emptySubText}>{i18n.t('select_files_on_pc')}</Text>
                </View>
            ) : (
                <FlatList
                    data={files}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.name}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Upload section - only for phone transfers when files are selected */}
            {isPhoneTransfer && filesToSend.length > 0 && (
                <View style={styles.uploadSection}>
                    <Text style={styles.uploadTitle}>
                        {i18n.t('send_to_host')} ({filesToSend.length} {i18n.t('files')})
                    </Text>

                    {uploading ? (
                        <View style={styles.uploadProgress}>
                            <Text style={styles.uploadingText}>
                                {i18n.t('uploading_file')}: {uploading}
                            </Text>
                            <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={handleUploadToHost}
                        >
                            <Icon name="upload" size={20} color="#fff" />
                            <Text style={styles.uploadButtonText}>{i18n.t('send_files_now')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, language: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        direction: language === 'ar' ? 'rtl' : 'ltr',
    },
    backButton: {
        padding: 10,
    },
    title: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: colors.text,
    },
    iconButton: {
        padding: 10,
        marginLeft: 8,
    },
    listContent: {
        padding: 20,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        direction: language === 'ar' ? 'rtl' : 'ltr',
    },
    fileIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: language === 'ar' ? 0 : 16,
        marginLeft: language === 'ar' ? 16 : 0,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.text,
        marginBottom: 4,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    fileSize: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    downloadButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressText: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        color: colors.primary,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
    },
    emptyText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    // Upload section styles
    uploadSection: {
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: 16,
    },
    uploadTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    uploadProgress: {
        alignItems: 'center',
    },
    uploadingText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    uploadButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadButtonText: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
});


