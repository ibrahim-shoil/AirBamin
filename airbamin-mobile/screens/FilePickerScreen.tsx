import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SelectedFile } from '../services/fileService';
import { useTheme } from '../contexts/ThemeContext';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';

interface FilePickerScreenProps {
    files: SelectedFile[];
    onAddFiles: () => void;
    onRemoveFile: (index: number) => void;
    onUpload: () => void;
    isUploading: boolean;
    progress: number;
    onBack: () => void;
}

export default function FilePickerScreen({
    files,
    onAddFiles,
    onRemoveFile,
    onUpload,
    isUploading,
    progress,
    onBack,
}: FilePickerScreenProps) {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);

    const getFileIcon = (type: string) => {
        if (type.includes('image')) return 'IMG';
        if (type.includes('video')) return 'VID';
        if (type.includes('document') || type.includes('pdf')) return 'DOC';
        return 'FILE';
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('select_type')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <TouchableOpacity style={styles.addButton} onPress={onAddFiles}>
                <Text style={styles.addButtonText}>{i18n.t('tap_plus')}</Text>
            </TouchableOpacity>

            {files.length > 0 ? (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerText}>
                            {files.length} {i18n.t('files_selected')}
                        </Text>
                        <TouchableOpacity onPress={() => files.forEach((_, i) => onRemoveFile(0))}>
                            <Text style={styles.clearText}>{i18n.t('clear')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.fileList}>
                        {files.map((file, index) => (
                            <View key={index} style={styles.fileItem}>
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileIcon}>{getFileIcon(file.type)}</Text>
                                    <View style={styles.fileDetails}>
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {file.name}
                                        </Text>
                                        <Text style={styles.fileSize}>
                                            {formatFileSize(file.size)}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => onRemoveFile(index)}
                                >
                                    <Text style={styles.removeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    {isUploading ? (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>
                                {i18n.t('uploading')} {Math.round(progress)}%
                            </Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[styles.progressFill, { width: `${progress}%` }]}
                                />
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={onUpload}
                        >
                            <Text style={styles.uploadButtonText}>
                                {i18n.t('upload')} {files.length} {i18n.t('files_selected')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>[ ]</Text>
                    <Text style={styles.emptyText}>{i18n.t('no_files')}</Text>
                    <Text style={styles.emptyHint}>
                        {i18n.t('tap_plus')}
                    </Text>
                </View>
            )}
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: 60,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: colors.primary,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
    },
    addButton: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 20,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    clearText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    fileList: {
        flex: 1,
        marginBottom: 20,
    },
    fileItem: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.border,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileIcon: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        marginRight: 12,
        width: 32,
    },
    fileDetails: {
        flex: 1,
    },
    fileName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'left',
    },
    fileSize: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'left',
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#ffe5e5',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    removeButtonText: {
        color: colors.error,
        fontSize: 14,
        fontWeight: '700',
    },
    uploadButton: {
        backgroundColor: colors.secondary,
        padding: 20,
        borderRadius: 14,
        alignItems: 'center',
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    progressContainer: {
        padding: 20,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
    },
    progressText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    progressBar: {
        height: 8,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e5e5ea',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.secondary,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
        color: colors.textSecondary,
        opacity: 0.3,
    },
    emptyText: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyHint: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
