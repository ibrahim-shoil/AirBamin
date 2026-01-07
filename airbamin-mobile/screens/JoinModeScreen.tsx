import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import QRScanner from '../components/QRScanner';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import phoneServerService from '../services/phoneServerService';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

export default function JoinModeScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const [code, setCode] = useState('');
    const [showScanner, setShowScanner] = useState(false);
    const [joining, setJoining] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    const handleJoin = async () => {
        console.log('🔵 handleJoin called with code:', code);

        const trimmedCode = code.trim();

        // If code contains colons, it's a full connection string (IP:PORT:CODE)
        if (trimmedCode.includes(':')) {
            console.log('🔵 Full connection string detected, using direct connection');
            connectWithString(trimmedCode);
            return;
        }

        // Just a code without IP - show helpful message to use QR scanner
        Alert.alert(
            i18n.t('scan_qr_instruction'),
            'Please scan the QR code from the host device, or enter the full connection info (IP:PORT:CODE).\n\nExample: 192.168.1.10:8095:123456',
            [
                { text: i18n.t('scan_qr_code'), onPress: () => setShowScanner(true) },
                { text: i18n.t('cancel'), style: 'cancel' }
            ]
        );
    };

    const connectWithString = async (connectionString: string) => {
        setJoining(true);
        const result = await phoneServerService.connectToHost(connectionString);
        setJoining(false);

        console.log('🔵 connectWithString result:', result);

        if (result.success && result.hostIP && result.files) {
            console.log('🔵 Navigating to Receive with files:', result.files);
            navigation.navigate('Receive', {
                hostIP: result.hostIP,
                isPhoneTransfer: true,
                phoneFiles: result.files  // Pass the files directly!
            });
        } else {
            Alert.alert(i18n.t('error'), i18n.t('connection_failed_phone'));
        }
    };

    const handleScan = (data: string) => {
        setShowScanner(false);
        if (data) {
            // If scanned data is just code (unlikely from our app, but possible)
            if (!data.includes(':') && data.length === 6) {
                setCode(data);
                // We could auto-join here, but let's let user confirm
            } else {
                // Full connection string
                connectWithString(data);
            }
        }
    };

    const styles = getStyles(colors, isDark, language);

    if (showScanner) {
        return (
            <QRScanner
                onScanComplete={handleScan}
                onClose={() => setShowScanner(false)}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>{i18n.t('receive_files')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.title}>{i18n.t('join_mode_title')}</Text>
                    <Text style={styles.subtitle}>{i18n.t('join_mode_subtitle')}</Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="IP:PORT:CODE"
                            placeholderTextColor={colors.textSecondary}
                            value={code}
                            onChangeText={setCode}
                            keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {joining && (
                        <View style={{ marginBottom: 20, alignItems: 'center' }}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={{ marginTop: 10, color: colors.textSecondary }}>
                                {i18n.t('searching_for_host')} {scanProgress > 0 ? `(${scanProgress}%)` : ''}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => setShowScanner(true)}
                        disabled={joining}
                    >
                        <Icon name="camera" size={20} color={colors.primary} />
                        <Text style={styles.scanButtonText}>{i18n.t('scan_qr_code')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.joinButton, (code.length < 6 || joining) && styles.disabledButton]}
                        onPress={handleJoin}
                        disabled={code.length < 6 || joining}
                    >
                        <Text style={styles.joinButtonText}>{i18n.t('join_session')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: colors.text,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    input: {
        backgroundColor: colors.inputBg,
        borderRadius: 16,
        padding: 20,
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        letterSpacing: 4,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 32,
        padding: 12,
    },
    scanButtonText: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.primary,
    },
    joinButton: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    joinButtonText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.5,
    },
});


