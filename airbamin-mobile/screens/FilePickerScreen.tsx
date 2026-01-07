import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import { useConnection } from '../contexts/ConnectionContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Files'>;

interface FileItem {
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
}

export default function FilePickerScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const { isConnected, connectedIP } = useConnection();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showTypeSelect, setShowTypeSelect] = useState(false);

    const handleAddPress = () => {
        Alert.alert(
            i18n.t('select_type'),
            i18n.t('choose_source'),
            [
                {
                    text: i18n.t('documents'),
                    onPress: handlePickDocuments,
                    style: 'default',
                },
                {
                    text: i18n.t('photos_videos'),
                    onPress: handlePickImages,
                    style: 'default',
                },
                {
                    text: i18n.t('cancel'),
                    style: 'cancel',
                },
            ]
        );
    };

    const handlePickDocuments = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: true,
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets) {
                const newFiles = result.assets.map(asset => ({
                    uri: asset.uri,
                    name: asset.name,
                    size: asset.size,
                    mimeType: asset.mimeType
                }));
                setFiles(prev => [...prev, ...newFiles]);
            }
        } catch (err) {
            console.error('Error picking files:', err);
            Alert.alert(i18n.t('error'), 'Failed to pick files');
        }
    };

    const handlePickImages = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert(i18n.t('permission_denied'), i18n.t('permission_msg'));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled) {
                const newFiles = result.assets.map(asset => {
                    const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
                    return {
                        uri: asset.uri,
                        name: fileName,
                        size: asset.fileSize,
                        mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')
                    };
                });
                setFiles(prev => [...prev, ...newFiles]);
            }
        } catch (err) {
            console.error('Error picking images:', err);
            Alert.alert(i18n.t('error'), 'Failed to pick images');
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        if (!isConnected || !connectedIP) {
            Alert.alert(i18n.t('error'), 'Please connect to your PC first');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const batchId = Date.now().toString();
            const baseUrl = `http://${connectedIP}`;

            console.log('[UPLOAD] Starting upload to:', baseUrl);
            console.log('[UPLOAD] Files to upload:', files.length);

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`[UPLOAD] Uploading file ${i + 1}/${files.length}:`, file.name);

                // Fetch the file as blob
                const response = await fetch(file.uri);
                if (!response.ok) {
                    throw new Error(`Failed to read file: ${file.name}`);
                }
                const blob = await response.blob();
                console.log(`[UPLOAD] File blob size: ${blob.size} bytes`);

                // Upload to desktop's /upload endpoint
                const uploadUrl = `${baseUrl}/upload?filename=${encodeURIComponent(file.name)}&batchId=${batchId}&index=${i + 1}&total=${files.length}`;
                console.log('[UPLOAD] Upload URL:', uploadUrl);

                const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': file.mimeType || 'application/octet-stream',
                    },
                    body: blob,
                });

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text();
                    console.error('[UPLOAD] Upload failed:', uploadResponse.status, errorText);
                    throw new Error(`Upload failed for ${file.name}: ${uploadResponse.status}`);
                }

                const responseText = await uploadResponse.text();
                console.log(`[UPLOAD] Upload response for ${file.name}:`, responseText);

                // Update progress
                setUploadProgress(Math.round(((i + 1) / files.length) * 100));
            }

            console.log('[UPLOAD] All files uploaded successfully');
            Alert.alert(i18n.t('success'), i18n.t('upload_complete'));
            setFiles([]);
            setUploadProgress(0);
            navigation.goBack();
        } catch (error: any) {
            console.error('[UPLOAD] Upload error:', error);
            Alert.alert(
                i18n.t('error'),
                `Upload failed:\n\n${error.message || 'Unknown error'}\n\nCheck:\n1. PC is connected\n2. Desktop app is running\n3. Same WiFi network`
            );
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const styles = getStyles(colors, isDark, language);

    const renderFileItem = ({ item, index }: { item: FileItem; index: number }) => (
        <View style={styles.fileItem}>
            <View style={styles.fileInfo}>
                <Icon name="file" size={24} color={colors.primary} />
                <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                    {item.size && (
                        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
                    )}
                </View>
            </View>
            <TouchableOpacity onPress={() => handleRemoveFile(index)} style={styles.removeButton}>
                <Icon name="x" size={20} color={colors.error} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>{i18n.t('select_files')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {files.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="upload-cloud" size={64} color={colors.textSecondary} style={{ opacity: 0.3, marginBottom: 24 }} />
                        <Text style={styles.emptyText}>{i18n.t('no_files_selected')}</Text>
                        <Text style={styles.emptyHint}>{i18n.t('tap_plus_to_add')}</Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={files}
                            renderItem={renderFileItem}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={styles.listContent}
                        />

                        <View style={styles.uploadButtonContainer}>
                            {loading && uploadProgress > 0 && (
                                <View style={styles.progressContainer}>
                                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: colors.primary }]} />
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                                onPress={handleUpload}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <View style={styles.uploadButtonContent}>
                                        <Icon name="upload" size={24} color="#fff" style={{ marginRight: 12 }} />
                                        <Text style={styles.uploadButtonText}>
                                            {i18n.t('upload_to_pc')} ({files.length})
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
                <Icon name="plus" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, language: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: colors.text,
    },
    content: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    fileItem: {
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    fileInfo: {
        flex: 1,
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12,
    },
    fileDetails: {
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
    removeButton: {
        padding: 8,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
    },
    emptyHint: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 130,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    uploadButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 20,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.inputBg,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    uploadButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
});


