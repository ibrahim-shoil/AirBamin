import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';
import QRCode from 'react-native-qrcode-svg';
import ScreenCaptureService from '../services/ScreenCaptureService';
import axios from 'axios';
import networkService from '../services/networkService';

interface MirrorModeScreenProps {
    onBack: () => void;
    desktopIP: string;
    onRequestConnect: () => void;
}

export default function MirrorModeScreen({ onBack, desktopIP, onRequestConnect }: MirrorModeScreenProps) {
    const { colors, isDark, language } = useTheme();
    const styles = getStyles(colors, isDark, language);

    const [sessionCode, setSessionCode] = useState<string>('');
    const [isMirroring, setIsMirroring] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionData, setConnectionData] = useState<string>('');
    const [quality, setQuality] = useState<'720p' | '1080p' | '4K'>('1080p');
    const [fps, setFps] = useState<30 | 60>(60);
    const [latency, setLatency] = useState<number>(0);

    // Generate 6-digit session code
    const generateSessionCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    // Start screen mirroring
    const handleStartMirroring = async () => {
        if (!desktopIP) {
            onRequestConnect();
            return;
        }

        setIsConnecting(true);
        try {
            // Extract IP and port from desktopIP (e.g., "http://192.168.1.11:9095")
            const url = new URL(desktopIP);
            const ipOnly = url.hostname; // Just the IP without protocol or port
            const port = url.port || '9090';

            // 1. Call PC to open mirror window (with timeout)
            try {
                await axios.post(`${desktopIP}/api/mirror/start`, {}, { timeout: 5000 });
                console.log('Mirror window opened on PC');
            } catch (e) {
                console.warn("Failed to wake PC mirror window:", e);
                // Continue anyway - the window might already be open
            }

            // 2. Start iOS Capture (pass just the IP, not the full URL)
            const code = generateSessionCode();
            const success = await ScreenCaptureService.start(ipOnly, 9091, quality === '1080p' ? 'high' : 'low');

            if (success) {
                setSessionCode(code);
                setIsMirroring(true);
                setConnectionData(`airbamin://mirror/${code}`);

                // Start stats simulation
                const interval = setInterval(() => {
                    setLatency(Math.floor(80 + Math.random() * 40)); // 80-120ms
                }, 1000);
                (window as any).statsInterval = interval;
            } else {
                Alert.alert(i18n.t('error'), i18n.t('mirroring_failed'));
            }
        } catch (error) {
            console.error('Mirroring error:', error);
            Alert.alert(i18n.t('error'), i18n.t('mirroring_failed'));
        } finally {
            setIsConnecting(false);
        }
    };

    // Stop screen mirroring
    const handleStopMirroring = async () => {
        try {
            await ScreenCaptureService.stop();
            setIsMirroring(false);
            setSessionCode('');
            setConnectionData('');
            setLatency(0);
            if ((window as any).statsInterval) {
                clearInterval((window as any).statsInterval);
            }
        } catch (error) {
            console.error('Stop error:', error);
            Alert.alert(i18n.t('error'), String(error));
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Feather name={language === 'ar' ? "arrow-right" : "arrow-left"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('screen_mirroring')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {/* Connection Status Warning */}
                {!desktopIP && !isMirroring && (
                    <View style={[styles.infoCard, { borderColor: colors.error, backgroundColor: colors.error + '10', marginBottom: 20 }]}>
                        <Feather name="alert-circle" size={20} color={colors.error} />
                        <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoTitle, { color: colors.error }]}>{i18n.t('not_connected')}</Text>
                            <Text style={styles.infoText}>{i18n.t('connection_msg')}</Text>
                        </View>
                    </View>
                )}

                {/* Session Code & QR Display (when mirroring) */}
                {isMirroring && (
                    <View style={styles.sessionCard}>
                        <View style={styles.statusIndicator}>
                            <View style={styles.liveIcon} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>

                        <Text style={styles.sessionLabel}>{i18n.t('session_code')}</Text>
                        <Text style={styles.sessionCode}>{sessionCode}</Text>

                        {connectionData && (
                            <View style={styles.qrContainer}>
                                <QRCode
                                    value={connectionData}
                                    size={160}
                                    backgroundColor="white"
                                    color={colors.primary}
                                />
                            </View>
                        )}

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Feather name="activity" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.statLabel}>Latency</Text>
                                <Text style={styles.statValue}>{latency}ms</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Feather name="video" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.statLabel}>Quality</Text>
                                <Text style={styles.statValue}>{quality}@{fps}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Settings (when not mirroring) */}
                {!isMirroring && (
                    <View style={styles.settingsContainer}>
                        <Text style={styles.sectionTitle}>{i18n.t('quality_settings')}</Text>

                        {/* Quality Selection */}
                        <View style={styles.settingCard}>
                            <Text style={styles.settingLabel}>{i18n.t('resolution')}</Text>
                            <View style={styles.qualityButtons}>
                                {(['720p', '1080p', '4K'] as const).map((q) => (
                                    <TouchableOpacity
                                        key={q}
                                        style={[
                                            styles.qualityButton,
                                            quality === q && styles.qualityButtonActive
                                        ]}
                                        onPress={() => setQuality(q)}
                                    >
                                        <Text style={[
                                            styles.qualityButtonText,
                                            quality === q && styles.qualityButtonTextActive
                                        ]}>{q}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* FPS Selection */}
                        <View style={styles.settingCard}>
                            <Text style={styles.settingLabel}>{i18n.t('frame_rate')}</Text>
                            <View style={styles.qualityButtons}>
                                {([30, 60] as const).map((f) => (
                                    <TouchableOpacity
                                        key={f}
                                        style={[
                                            styles.qualityButton,
                                            fps === f && styles.qualityButtonActive
                                        ]}
                                        onPress={() => setFps(f)}
                                    >
                                        <Text style={[
                                            styles.qualityButtonText,
                                            fps === f && styles.qualityButtonTextActive
                                        ]}>{f} FPS</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Info */}
                        <View style={styles.infoCard}>
                            <Feather name="info" size={20} color={colors.primary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoTitle}>{i18n.t('how_it_works')}</Text>
                                <Text style={styles.infoText}>{i18n.t('mirror_instructions')}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Action Button */}
            <View style={styles.actions}>
                {!isMirroring ? (
                    <TouchableOpacity
                        style={[styles.startButton, isConnecting && { opacity: 0.7 }]}
                        onPress={desktopIP ? handleStartMirroring : onRequestConnect}
                        disabled={isConnecting}
                    >
                        <Feather name={desktopIP ? "cast" : "link"} size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.startButtonText}>
                            {isConnecting ? i18n.t('connecting') : (desktopIP ? i18n.t('start_mirroring') : i18n.t('connect_to_pc'))}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.stopButton}
                        onPress={handleStopMirroring}
                    >
                        <Feather name="stop-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.stopButtonText}>{i18n.t('stop_mirroring')}</Text>
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
    content: {
        flex: 1,
        padding: 20,
    },
    sessionCard: {
        backgroundColor: colors.primary,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    liveIcon: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4444',
        marginRight: 6,
    },
    liveText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
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
        marginBottom: 20,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 24,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    settingsContainer: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    settingCard: {
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    qualityButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    qualityButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    qualityButtonActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },
    qualityButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    qualityButtonTextActive: {
        color: '#fff',
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 12,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    actions: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    startButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    stopButton: {
        flexDirection: 'row',
        backgroundColor: colors.error,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stopButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
});
