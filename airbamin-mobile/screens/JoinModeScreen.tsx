import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';
import phoneServerService from '../services/phoneServerService';

interface JoinModeScreenProps {
    onBack: () => void;
    onJoinSuccess: (sessionCode: string, hostIP: string) => void;
}

export default function JoinModeScreen({ onBack, onJoinSuccess }: JoinModeScreenProps) {
    const { colors, isDark, language } = useTheme();
    const styles = getStyles(colors, isDark, language);

    const [sessionCode, setSessionCode] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleJoin = async () => {
        if (sessionCode.length !== 6) {
            Alert.alert(i18n.t('error'), i18n.t('invalid_session_code'));
            return;
        }

        setIsConnecting(true);

        const result = await phoneServerService.connectToHost(sessionCode);

        setIsConnecting(false);

        if (result.success && result.hostIP) {
            Alert.alert(i18n.t('success'), i18n.t('connected_to_host'));
            onJoinSuccess(sessionCode, result.hostIP);
        } else {
            Alert.alert(i18n.t('error'), i18n.t('connection_failed_phone'));
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Feather name={language === 'ar' ? "arrow-right" : "arrow-left"} size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('receive_from_phone')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Feather name="smartphone" size={64} color={colors.primary} />
                </View>

                <Text style={styles.instructionTitle}>{i18n.t('enter_session_code')}</Text>
                <Text style={styles.instructionText}>{i18n.t('session_code_instruction')}</Text>

                {/* Session Code Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={sessionCode}
                        onChangeText={(text) => setSessionCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                        placeholder="000000"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!isConnecting}
                    />
                </View>

                {/* Connect Button */}
                <TouchableOpacity
                    style={[styles.connectButton, (sessionCode.length !== 6 || isConnecting) && styles.disabledButton]}
                    onPress={handleJoin}
                    disabled={sessionCode.length !== 6 || isConnecting}
                >
                    {isConnecting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.connectButtonText}>{i18n.t('connect')}</Text>
                    )}
                </TouchableOpacity>

                {/* Or Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{i18n.t('or')}</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Scan QR Button */}
                <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => Alert.alert(i18n.t('coming_soon'), i18n.t('qr_scan_coming_soon'))}
                >
                    <Feather name="camera" size={20} color={colors.primary} />
                    <Text style={styles.scanButtonText}>{i18n.t('scan_qr_code')}</Text>
                </TouchableOpacity>
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    instructionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    instructionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 24,
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        letterSpacing: 16,
    },
    connectButton: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    connectButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.5,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
        color: colors.textSecondary,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: 'transparent',
    },
    scanButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
});
