import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Feather from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import { useConnection } from '../contexts/ConnectionContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Connect'>;

export default function ConnectScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const { isConnected, connectedIP, connect, disconnect } = useConnection();
    const [permission, requestPermission] = useCameraPermissions();
    const [showScanner, setShowScanner] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [ipAddress, setIpAddress] = useState('');
    const scannedRef = useRef(false);

    // Scanner Animation
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showScanner) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scanAnim.setValue(0);
        }
    }, [showScanner]);

    const translateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-120, 120],
    });

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scannedRef.current) return;
        scannedRef.current = true;

        const ip = data.replace('airbamin://', '').trim();
        setShowScanner(false);
        connectToPC(ip);
    };

    const connectToPC = async (ip: string) => {
        const trimmedIP = ip.trim();
        if (!trimmedIP || trimmedIP.length < 7) {
            Alert.alert(i18n.t('error'), i18n.t('please_enter_ip'));
            return;
        }

        try {
            await connect(trimmedIP);
            Alert.alert(i18n.t('success'), i18n.t('connected_msg'));
        } catch (error) {
            console.error('Connection error:', error);
            Alert.alert(
                i18n.t('connection_failed'),
                `Could not connect to ${trimmedIP}. Make sure:\n\n1. PC and phone on same WiFi\n2. Desktop app is running\n3. IP address is correct\n\nError: ${(error as any).message || 'Network error'}`
            );
        }
    };

    const handleManualConnect = () => {
        if (!ipAddress.trim()) {
            Alert.alert(i18n.t('error'), i18n.t('please_enter_ip'));
            return;
        }
        setShowManualEntry(false);
        connectToPC(ipAddress.trim());
    };

    const handleScanPress = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(i18n.t('error'), i18n.t('camera_permission_required'));
                return;
            }
        }
        scannedRef.current = false;
        setShowScanner(true);
    };

    const styles = getStyles(colors, isDark, language);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{i18n.t('connect_to_pc')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Connection Status */}
                <View style={styles.statusCard}>
                    <View style={[
                        styles.statusIndicator,
                        { backgroundColor: isConnected ? colors.success : colors.textSecondary }
                    ]} />
                    <View style={styles.statusTextContainer}>
                        <Text style={styles.statusLabel}>
                            {isConnected ? i18n.t('connected') : i18n.t('not_connected')}
                        </Text>
                        {isConnected && (
                            <Text style={styles.statusIP}>{connectedIP}</Text>
                        )}
                    </View>
                    {isConnected && (
                        <TouchableOpacity
                            onPress={disconnect}
                            style={styles.disconnectButton}
                        >
                            <Feather name="x-circle" size={20} color={colors.error} />
                            <Text style={[styles.disconnectText, { color: colors.error }]}>
                                {i18n.t('disconnect')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Action Buttons */}
                {!isConnected ? (
                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.primary }]}
                            onPress={handleScanPress}
                        >
                            <Feather name="maximize" size={24} color="#fff" style={{ marginBottom: 8 }} />
                            <Text style={styles.actionButtonText}>{i18n.t('scan_qr_code')}</Text>
                        </TouchableOpacity>

                        <View style={styles.manualIpContainer}>
                            <Text style={styles.sectionTitle}>{i18n.t('enter_ip_manually')}</Text>
                            <View style={styles.ipInputContainer}>
                                <TextInput
                                    style={styles.ipInput}
                                    placeholder="192.168.1.x"
                                    placeholderTextColor={colors.textSecondary}
                                    value={ipAddress}
                                    onChangeText={setIpAddress}
                                    keyboardType="numeric"
                                    onSubmitEditing={handleManualConnect}
                                />
                                <TouchableOpacity
                                    style={styles.arrowButton}
                                    onPress={handleManualConnect}
                                >
                                    <Feather name="arrow-right" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.connectedActionsContainer}>
                        <Text style={styles.connectedActionsTitle}>{i18n.t('what_would_you_like')}</Text>

                        <TouchableOpacity
                            style={[styles.connectedActionButton, { backgroundColor: colors.primary }]}
                            onPress={() => navigation.navigate('Files')}
                        >
                            <Feather name="upload" size={28} color="#fff" style={{ marginBottom: 12 }} />
                            <Text style={styles.connectedActionTitle}>{i18n.t('upload_files')}</Text>
                            <Text style={styles.connectedActionDesc}>{i18n.t('phone_to_pc')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.connectedActionButton, { backgroundColor: colors.success }]}
                            onPress={() => navigation.navigate('Receive')}
                        >
                            <Feather name="download" size={28} color="#fff" style={{ marginBottom: 12 }} />
                            <Text style={styles.connectedActionTitle}>{i18n.t('receive_files')}</Text>
                            <Text style={styles.connectedActionDesc}>{i18n.t('pc_to_phone')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* How It Works */}
                <View style={styles.howItWorksSection}>
                    <Text style={styles.sectionTitle}>{i18n.t('how_it_works')}</Text>

                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <Text style={styles.stepText}>{i18n.t('step_1')}</Text>
                    </View>

                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <Text style={styles.stepText}>{i18n.t('step_2')}</Text>
                    </View>

                    <View style={styles.step}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <Text style={styles.stepText}>{i18n.t('step_3')}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* QR Scanner Modal */}
            <Modal
                visible={showScanner}
                animationType="slide"
                onRequestClose={() => setShowScanner(false)}
            >
                <SafeAreaView style={styles.scannerContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                    >
                        <View style={styles.scannerOverlay}>
                            <View style={styles.scannerHeader}>
                                <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.closeButton}>
                                    <Feather name="x" size={28} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.scannerTitle}>{i18n.t('scan_qr_code')}</Text>
                                <View style={{ width: 40 }} />
                            </View>

                            <View style={styles.scanArea}>
                                <View style={styles.scanFrame} />
                                <Animated.View
                                    style={[
                                        styles.scanLine,
                                        { transform: [{ translateY }] }
                                    ]}
                                />
                            </View>

                            <Text style={styles.scanInstruction}>{i18n.t('scan_qr_instruction')}</Text>
                        </View>
                    </CameraView>
                </SafeAreaView>
            </Modal>

            {/* Manual IP Entry Modal */}
            <Modal
                visible={showManualEntry}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowManualEntry(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{i18n.t('enter_ip_manually')}</Text>
                        <Text style={styles.modalSubtitle}>{i18n.t('enter_pc_ip_address')}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="192.168.1.100"
                            placeholderTextColor={colors.textSecondary}
                            value={ipAddress}
                            onChangeText={setIpAddress}
                            keyboardType="numeric"
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowManualEntry(false)}
                            >
                                <Text style={styles.cancelButtonText}>{i18n.t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.connectButton]}
                                onPress={handleManualConnect}
                            >
                                <Text style={styles.connectButtonText}>{i18n.t('connect')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
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
        textAlign: 'left',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
    },
    statusIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginEnd: 16,
    },
    statusTextContainer: {
        flex: 1,
        alignItems: 'flex-start',
    },
    statusLabel: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.text,
        marginBottom: 4,
        textAlign: 'left',
        width: '100%',
    },
    statusIP: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: 'left',
        width: '100%',
    },
    disconnectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.inputBg,
    },
    disconnectText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
    buttonsContainer: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 32,
    },
    actionButton: {
        width: '100%',
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Fonts.regular,
        textAlign: 'center',
    },
    connectedActionsContainer: {
        marginBottom: 32,
    },
    connectedActionsTitle: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.text,
        marginBottom: 16,
        textAlign: 'left',
    },
    connectedActionButton: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    connectedActionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    connectedActionDesc: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
    howItWorksSection: {
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 20,
        textAlign: 'left',
    },
    step: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginEnd: 12,
    },
    stepNumberText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        lineHeight: 20,
        textAlign: 'left',
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 50, // Add explicit padding for status bar
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    closeButton: {
        padding: 12, // Increase touch target
    },
    scannerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    camera: {
        flex: 1,
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    scanArea: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#2F80ED',
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    scanLine: {
        position: 'absolute',
        width: 250,
        height: 2,
        backgroundColor: '#2F80ED',
        top: '50%',
        shadowColor: '#2F80ED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    scanInstruction: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'left',
    },
    modalSubtitle: {
        fontSize: 15,
        color: colors.text,
        marginBottom: 24,
        textAlign: 'left',
        lineHeight: 22,
    },
    input: {
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 24,
        textAlign: 'left',
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.inputBg,
    },
    cancelButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    connectButton: {
        backgroundColor: colors.primary,
    },
    connectButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    manualIpContainer: {
        marginTop: 12,
        width: '100%',
    },
    ipInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    ipInput: {
        flex: 1,
        height: 50,
        color: colors.text,
        fontSize: 16,
        textAlign: 'left',
    },
    arrowButton: {
        padding: 8,
        backgroundColor: colors.primary,
        borderRadius: 8,
        marginStart: 8,
    },
});


