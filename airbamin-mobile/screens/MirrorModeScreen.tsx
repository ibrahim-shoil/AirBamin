import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import { useConnection } from '../contexts/ConnectionContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Mirror'>;

export default function MirrorModeScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const { isConnected, connectedIP } = useConnection();
    const [isMirroring, setIsMirroring] = useState(false);
    const styles = getStyles(colors, isDark, language);

    useEffect(() => {
        if (!isConnected) {
            Alert.alert(i18n.t('error'), i18n.t('not_connected'));
            navigation.goBack();
        }
    }, [isConnected]);

    const toggleMirroring = async () => {
        if (isMirroring) {
            // Stop mirroring logic here
            setIsMirroring(false);
        } else {
            // Start mirroring logic here
            // This would typically involve native modules
            Alert.alert(i18n.t('info'), i18n.t('mirroring_started'));
            setIsMirroring(true);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* Back button removed as per user request */}
                <Text style={styles.title}>{i18n.t('screen_mirroring')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.statusContainer}>
                    <Icon name="monitor" size={64} color={isMirroring ? colors.primary : colors.textSecondary} />
                    <Text style={styles.statusText}>
                        {isMirroring ? i18n.t('mirroring_started') : i18n.t('mirror_desc')}
                    </Text>
                    {isConnected && <Text style={styles.ipText}>{i18n.t('connected_to')} {connectedIP}</Text>}
                </View>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: isMirroring ? colors.error : colors.primary }]}
                    onPress={toggleMirroring}
                >
                    <Text style={styles.actionButtonText}>
                        {isMirroring ? i18n.t('stop_mirroring') : i18n.t('start_mirroring')}
                    </Text>
                </TouchableOpacity>

                <View style={styles.instructions}>
                    <Text style={styles.instructionTitle}>{i18n.t('how_it_works')}</Text>
                    <Text style={styles.instructionText}>{i18n.t('mirror_instructions')}</Text>
                </View>
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
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    statusText: {
        fontSize: 18,
        fontFamily: Fonts.regular,
        color: colors.text,
        marginTop: 16,
        textAlign: 'center',
    },
    ipText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        marginTop: 8,
    },
    actionButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 32,
    },
    actionButtonText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    instructions: {
        width: '100%',
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
    },
    instructionTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 12,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    instructionText: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        lineHeight: 22,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
});


