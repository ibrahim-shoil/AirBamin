import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import networkService from '../services/networkService';
import fileService, { SelectedFile } from '../services/fileService';
import i18n from '../services/i18n';
import axios from 'axios';

interface AppContextType {
    isConnected: boolean;
    desktopIP: string;
    isConnecting: boolean;
    selectedFiles: SelectedFile[];
    isUploading: boolean;
    uploadProgress: number;
    connectToPC: (ip: string) => Promise<boolean>;
    disconnect: () => Promise<void>;
    addFiles: (type: 'photos' | 'videos' | 'documents' | 'all') => Promise<void>;
    removeFile: (index: number) => void;
    uploadFiles: () => Promise<void>;
    clearFiles: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [desktopIP, setDesktopIP] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const connectToPC = async (ip: string): Promise<boolean> => {
        setIsConnecting(true);
        try {
            let url = ip;
            if (!url.startsWith('http')) {
                url = `http://${ip}`;
            }
            if (url.endsWith('/')) {
                url = url.slice(0, -1);
            }
            // Add default port if missing and not http/https specific
            if (!url.includes(':', 6)) {
                url = `${url}:9090`;
            }

            const connected = await networkService.testConnection(url);
            setIsConnected(connected);
            if (connected) {
                setDesktopIP(url);
            }
            return connected;
        } catch (error) {
            console.error('Connection error:', error);
            return false;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = async () => {
        try {
            if (desktopIP) {
                await axios.post(`${desktopIP}/disconnect`);
            }
        } catch (e) {
            // Ignore error
        }
        setIsConnected(false);
        setDesktopIP('');
    };

    const addFiles = async (type: 'photos' | 'videos' | 'documents' | 'all') => {
        const hasPermission = await fileService.requestPermissions();
        if (!hasPermission) {
            Alert.alert(i18n.t('permission_denied'), i18n.t('permission_msg'));
            return;
        }

        let files: SelectedFile[] = [];
        switch (type) {
            case 'photos':
                files = await fileService.pickImages();
                break;
            case 'videos':
                files = await fileService.pickVideos();
                break;
            case 'documents':
                files = await fileService.pickDocuments();
                break;
            case 'all':
                files = await fileService.pickAllFiles();
                break;
        }
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const clearFiles = () => {
        setSelectedFiles([]);
    };

    const uploadFiles = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const { success, failed } = await networkService.uploadFiles(
                selectedFiles,
                (current, total, progress) => {
                    const totalProgress = ((current - 1) / total) * 100 + (progress / total);
                    setUploadProgress(totalProgress);
                }
            );

            setIsUploading(false);
            setUploadProgress(0);

            if (failed === 0) {
                Alert.alert(i18n.t('success'), i18n.t('upload_complete'));
                clearFiles();
            } else {
                Alert.alert(
                    i18n.t('upload_failed'),
                    `${success} uploaded, ${failed} failed`
                );
            }
        } catch (error) {
            console.error('Upload error:', error);
            setIsUploading(false);
            Alert.alert(i18n.t('error'), 'Upload process failed');
        }
    };

    return (
        <AppContext.Provider value={{
            isConnected,
            desktopIP,
            isConnecting,
            selectedFiles,
            isUploading,
            uploadProgress,
            connectToPC,
            disconnect,
            addFiles,
            removeFile,
            uploadFiles,
            clearFiles
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
