import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';

interface QRScannerProps {
    onClose: () => void;
    onScanComplete: (data: string) => void;
}

export default function QRScanner({ onClose, onScanComplete }: QRScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);

    React.useEffect(() => {
        requestCameraPermission();
    }, []);

    const requestCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (!scanned) {
            setScanned(true);
            // Delay callback slightly to ensure scanner closes first
            setTimeout(() => {
                onScanComplete(data);
            }, 100);
        }
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Requesting camera permission...</Text>
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera permission denied</Text>
                <TouchableOpacity style={styles.button} onPress={onClose}>
                    <Text style={styles.buttonText}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                }}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <Text style={styles.title}>{i18n.t('scan_qr')}</Text>
                    <Text style={styles.subtitle}>
                        {i18n.t('step_2')}
                    </Text>
                </View>

                <View style={styles.scanArea}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeButtonText}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    header: {
        marginTop: 60,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    scanArea: {
        width: 250,
        height: 250,
        alignSelf: 'center',
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: colors.primary,
        borderWidth: 4,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    closeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 40,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },
    button: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        alignSelf: 'center',
        width: 200,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});
