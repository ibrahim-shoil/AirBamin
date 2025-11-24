import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';
import fileService, { SelectedFile } from '../services/fileService';
import phoneServerService from '../services/phoneServerService';
import QRCode from 'react-native-qrcode-svg';

interface HostModeScreenProps {
    onBack: () => void;
}

export default function HostModeScreen({ onBack }: HostModeScreenProps) {
    const { colors, isDark, language } = useTheme();
    const styles = getStyles(colors, isDark, language);

    const [sessionCode, setSessionCode] = useState<string>('');
    const [isHosting, setIsHosting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [connectionData, setConnectionData] = useState<string>('');

    // Generate 6-digit session code
    const generateSessionCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Start hosting
    const startHosting = async () => {
        if (selectedFiles.length === 0) {
            Alert.alert(i18n.t('error'), i18n.t('select_files_first'));
            return;
        }

        const code = generateSessionCode();
        const success = await phoneServerService.startHosting(code, selectedFiles);

        if (success) {
            setSessionCode(code);
            setIsHosting(true);

            // Get connection data for QR code
            const connData = await phoneServerService.getConnectionData();
            if (connData) {
                setConnectionData(connData);
            }

            Alert.alert(i18n.t('hosting_started'), `${i18n.t('session_code')}: ${code}`);
        } else {
            Alert.alert(i18n.t('error'), i18n.t('hosting_failed'));
        }
    };

    // Stop hosting
    const stopHosting = () => {
        phoneServerService.stopHosting();
        setIsHosting(false);
        setSessionCode('');
        setConnectionData('');
    };

    // Add files
    const handleAddFiles = async () => {
        const hasPermission = await fileService.requestPermissions();
        if (!hasPermission) {
            Alert.alert(i18n.t('permission_denied'), i18n.t('permission_msg'));
            return;
        }

        Alert.alert(
            i18n.t('select_type'),
            undefined,
            [
                {
                    text: i18n.t('photos'),
                    onPress: async () => {
                        const files = await fileService.pickImages();
                        setSelectedFiles(prev => [...prev, ...files]);
                    },
                },
                {
                    text: i18n.t('videos'),
                    onPress: async () => {
                        const files = await fileService.pickVideos();
                        setSelectedFiles(prev => [...prev, ...files]);
                    },
                },
                {
                    text: i18n.t('documents'),
                    onPress: async () => {
                        const files = await fileService.pickDocuments();
                        setSelectedFiles(prev => [...prev, ...files]);
                    },
                },
                {
                    text: i18n.t('all_files'),
                    onPress: async () => {
                        const files = await fileService.pickAllFiles();
                        setSelectedFiles(prev => [...prev, ...files]);
                    },
                },
                {
                    text: i18n.t('cancel'),
                    style: 'cancel',
                },
            ]
        );
    };

    // Remove file
    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Format file size
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderFile = ({ item, index }: { item: SelectedFile; index: number }) => (
        <View style={styles.fileItem}>
            <View style={styles.fileIcon}>
                <Feather name="file" size={24} color={colors.text} />
            </View>
            <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.fileSize}>{formatSize(item.size)}</Text>
            </View>
            {!isHosting && (
                <TouchableOpacity onPress={() => removeFile(index)} style={styles.removeButton}>
                    <Feather name="x" size={20} color={colors.error} />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Feather name={language === 'ar' ? "arrow-right" : "arrow-left"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('share_files')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Session Code & QR Display (when hosting) */}
                {isHosting && (
                    <View style={styles.sessionCard}>
                        <Text style={styles.sessionLabel}>{i18n.t('session_code')}</Text>
                        <Text style={styles.sessionCode}>{sessionCode}</Text>
                        <Text style={styles.sessionHint}>{i18n.t('share_code_hint')}</Text>

                        {connectionData && (
                            <View style={styles.qrContainer}>
                                <QRCode
                                    value={connectionData}
                                    size={180}
                                    backgroundColor="white"
                                    color={colors.primary}
                                />
                            </View>
                        )}
                    </View>
                )}

                {/* Files List */}
                <View style={styles.content}>
                    {selectedFiles.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="folder" size={64} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                            <Text style={styles.emptyText}>{i18n.t('no_files_selected')}</Text>
                            <Text style={styles.emptyHint}>{i18n.t('tap_add_files')}</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.fileCount}>
                                {selectedFiles.length} {selectedFiles.length === 1 ? i18n.t('file') : i18n.t('files')}
                            </Text>
                            <FlatList
                                data={selectedFiles}
                                renderItem={renderFile}
                                keyExtractor={(item, index) => `${item.uri}-${index}`}
                                scrollEnabled={false}
                            />
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
                {!isHosting ? (
                    <>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddFiles}
                        >
                            <Feather name="plus" size={20} color={colors.primary} />
                            <Text style={styles.addButtonText}>{i18n.t('add_files')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.startButton, selectedFiles.length === 0 && styles.disabledButton]}
                            onPress={startHosting}
                            disabled={selectedFiles.length === 0}
                        >
                            <Text style={styles.startButtonText}>{i18n.t('start_sharing')}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={styles.stopButton}
                        onPress={stopHosting}
                    >
                        <Text style={styles.stopButtonText}>{i18n.t('stop_sharing')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, language: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
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
    },
    backButton: {
        padding: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    sessionCard: {
        backgroundColor: colors.primary,
        margin: 20,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
    sessionLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    sessionCode: {
        fontSize: 48,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 8,
    },
    sessionHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 8,
        textAlign: 'center',
    },
    qrContainer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
    },
    emptyHint: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
    },
    fileCount: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginVertical: 16,
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
    },
    fileIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    fileSize: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actions: {
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: 'transparent',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    startButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    stopButton: {
        backgroundColor: colors.error,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    stopButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
