import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Icon from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import phoneServerService from '../services/phoneServerService';
import fileService, { SelectedFile } from '../services/fileService';
import QRCode from 'react-native-qrcode-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Host'>;

export default function HostModeScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const [sessionCode, setSessionCode] = useState('');
    const [isHosting, setIsHosting] = useState(false);
    const [connectionData, setConnectionData] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [receivedFiles, setReceivedFiles] = useState<Array<{name: string; size: number; uri: string}>>([]);
    const styles = getStyles(colors, isDark, language);

    // Listen for files received from connected device
    useEffect(() => {
        if (isHosting) {
            phoneServerService.onFilesReceived((files) => {
                console.log('📥 Received files from connected device:', files);
                setReceivedFiles(files);
            });
        }
    }, [isHosting]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Don't auto-stop hosting on unmount - server needs to stay running
    // for phone transfers while the receiver downloads files
    // useEffect(() => {
    //     return () => {
    //         if (isHosting) {
    //             phoneServerService.stopHosting();
    //         }
    //     };
    // }, [isHosting]);

    const handleSelectFiles = async () => {
        try {
            const files = await fileService.pickAllFiles();
            if (files.length > 0) {
                setSelectedFiles(prev => [...prev, ...files]);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const generateCode = async () => {
        if (selectedFiles.length === 0) {
            Alert.alert(i18n.t('select_files_first'));
            return;
        }

        setIsLoading(true);
        try {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const result = await phoneServerService.startHosting(code, selectedFiles);

            if (result.success) {
                setSessionCode(code);
                setIsHosting(true);
                const data = await phoneServerService.getConnectionData();
                setConnectionData(data);
            } else {
                Alert.alert(i18n.t('error'), result.error || i18n.t('hosting_failed'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const stopHosting = () => {
        phoneServerService.stopHosting();
        setIsHosting(false);
        setSessionCode('');
        setConnectionData(null);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* Back button removed */}
                <Text style={styles.title}>{i18n.t('share_files')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {!isHosting ? (
                        <>
                            <Icon name="share-2" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                            <Text style={styles.cardTitle}>{i18n.t('start_sharing')}</Text>
                            <Text style={styles.cardDesc}>{i18n.t('tap_add_files')}</Text>

                            <TouchableOpacity
                                style={styles.addFilesButton}
                                onPress={handleSelectFiles}
                            >
                                <Icon name="plus" size={24} color={colors.primary} />
                                <Text style={styles.addFilesText}>
                                    {selectedFiles.length > 0
                                        ? `${selectedFiles.length} ${i18n.t('files_selected')}`
                                        : i18n.t('add_files')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.primary, marginTop: 20, opacity: isLoading ? 0.7 : 1 }]}
                                onPress={generateCode}
                                disabled={isLoading}
                            >
                                <Text style={styles.actionButtonText}>
                                    {isLoading ? i18n.t('loading') + '...' : i18n.t('start_sharing')}
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={styles.cardTitle}>{i18n.t('hosting_started')}</Text>
                            <Text style={styles.cardDesc}>{i18n.t('scan_qr_or_enter')}</Text>

                            {connectionData && (
                                <View style={styles.qrContainer}>
                                    <QRCode
                                        value={connectionData}
                                        size={200}
                                        color={colors.text}
                                        backgroundColor={colors.card}
                                    />
                                </View>
                            )}

                            <View style={styles.codeContainer}>
                                <Text style={styles.codeLabel}>{i18n.t('connection_info')}</Text>
                                <Text style={[styles.codeValue, { fontSize: 14 }]} selectable={true}>
                                    {connectionData}
                                </Text>
                            </View>

                            {/* Add More Files button */}
                            <TouchableOpacity
                                style={styles.addFilesButton}
                                onPress={handleSelectFiles}
                            >
                                <Icon name="plus" size={24} color={colors.primary} />
                                <Text style={styles.addFilesText}>{i18n.t('add_more_files')}</Text>
                            </TouchableOpacity>

                            {/* Received files from connected device */}
                            {receivedFiles.length > 0 && (
                                <View style={styles.receivedSection}>
                                    <Text style={styles.receivedTitle}>
                                        {i18n.t('receive_files')} ({receivedFiles.length})
                                    </Text>
                                    {receivedFiles.map((file, index) => (
                                        <View key={index} style={styles.receivedFileItem}>
                                            <Icon name="file" size={20} color={colors.text} />
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.receivedFileName} numberOfLines={1}>{file.name}</Text>
                                                <Text style={styles.receivedFileSize}>{formatSize(file.size)}</Text>
                                            </View>
                                            <Icon name="check-circle" size={20} color={colors.primary} />
                                        </View>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.error, marginTop: 16 }]}
                                onPress={stopHosting}
                            >
                                <Text style={styles.actionButtonText}>{i18n.t('stop_sharing')}</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
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
        justifyContent: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: colors.text,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    cardTitle: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    cardDesc: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    codeContainer: {
        backgroundColor: colors.inputBg,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.border,
    },
    codeLabel: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    codeValue: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: colors.primary,
        letterSpacing: 4,
    },
    actionButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    addFilesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        width: '100%',
        justifyContent: 'center',
        gap: 8,
    },
    addFilesText: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.primary,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 24,
    },
    // Received files styles
    receivedSection: {
        width: '100%',
        marginTop: 16,
        padding: 16,
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    receivedTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 12,
    },
    receivedFileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    receivedFileName: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.text,
    },
    receivedFileSize: {
        fontSize: 12,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
    },
});


