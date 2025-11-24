import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import networkService from '../services/networkService';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_DOWNLOAD_FOLDER = 'download_folder_uri';

interface ReceiveScreenProps {
    onBack: () => void;
}

interface HostedFile {
    name: string;
    size: number;
}

export default function ReceiveScreen({ onBack }: ReceiveScreenProps) {
    const { colors, isDark, language } = useTheme();
    const styles = getStyles(colors, isDark, language);

    const [files, setFiles] = useState<HostedFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [downloadFolder, setDownloadFolder] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles(true);
        loadDownloadFolder();
        const interval = setInterval(() => fetchFiles(false), 4000);
        return () => clearInterval(interval);
    }, []);

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
        if (isInitial) setLoading(true);
        try {
            const fileList = await networkService.getHostedFiles();
            setFiles(fileList);
        } catch (error) {
            console.log('Error fetching files:', error);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    const handleDownload = async (file: HostedFile) => {
        setDownloading(file.name);
        setProgress(0);

        const cacheUri = await networkService.downloadHostedFile(file.name, (p) => {
            setProgress(p);
        });

        setDownloading(null);

        if (!cacheUri) {
            Alert.alert(i18n.t('error'), i18n.t('download_failed'));
            return;
        }

        try {
            if (Platform.OS === 'android' && downloadFolder) {
                try {
                    const content = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
                    const mimeType = networkService.getMimeType(file.name);
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
        let successCount = 0;
        let failCount = 0;

        for (const file of files) {
            try {
                setDownloading(file.name);
                setProgress(0);

                const cacheUri = await networkService.downloadHostedFile(file.name, (p) => setProgress(p));

                if (!cacheUri) {
                    failCount++;
                    continue;
                }

                if (downloadFolder) {
                    try {
                        const content = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
                        const mimeType = networkService.getMimeType(file.name);
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

    const downloadAllIOS = async () => {
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                setDownloading(file.name);
                setProgress(0);

                const cacheUri = await networkService.downloadHostedFile(file.name, (p) => setProgress(p));

                if (!cacheUri) {
                    failCount++;
                    continue;
                }

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(cacheUri, {
                        dialogTitle: `${i18n.t('save')} ${file.name} (${i + 1}/${files.length})`,
                        UTI: networkService.getMimeType(file.name)
                    });
                    successCount++;

                    // Wait for share sheet to close before next file
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    failCount++;
                }
            } catch (e) {
                console.error(e);
                failCount++;
            }
        }

        setDownloading(null);
        Alert.alert(i18n.t('complete'), `${i18n.t('files_downloaded')}: ${successCount}`);
    };

    const shareFile = async (uri: string) => {
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
        } else {
            Alert.alert(i18n.t('error'), i18n.t('sharing_not_available'));
        }
    };

    const renderItem = ({ item }: { item: HostedFile }) => (
        <View style={styles.fileItem}>
            <View style={styles.fileIcon}>
                <Feather name="file" size={24} color={colors.text} />
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
                    <Feather name="download" size={20} color={colors.primary} />
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Feather name={language === 'ar' ? "arrow-right" : "arrow-left"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('receive_files')}</Text>

                <View style={{ flexDirection: 'row' }}>
                    {Platform.OS === 'android' && (
                        <TouchableOpacity onPress={selectDownloadFolder} style={styles.iconButton}>
                            <Feather name="folder" size={20} color={downloadFolder ? colors.primary : colors.text} />
                        </TouchableOpacity>
                    )}
                    {files.length > 0 && (
                        <TouchableOpacity onPress={handleDownloadAll} style={styles.iconButton} disabled={!!downloading}>
                            <Feather name="download-cloud" size={20} color={downloading ? colors.textSecondary : colors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => fetchFiles(true)} style={styles.iconButton}>
                        <Feather name="refresh-cw" size={20} color={colors.text} />
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
        fontWeight: '700',
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
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    fileSize: {
        fontSize: 14,
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
        fontWeight: '700',
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
        color: colors.textSecondary,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
