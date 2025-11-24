import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';
import GlassView from '../components/GlassView';

interface ModeSelectionScreenProps {
    onSelectPC: () => void;
    onSelectPhone: (mode: 'host' | 'join') => void;
    onSelectMirror: () => void;
    onSettings: () => void;
}

export default function ModeSelectionScreen({ onSelectPC, onSelectPhone, onSelectMirror, onSettings }: ModeSelectionScreenProps) {
    const { colors, isDark, language } = useTheme();
    const styles = getStyles(colors, isDark, language);

    const handlePhoneMode = () => {
        Alert.alert(
            i18n.t('connect_to_phone'),
            i18n.t('choose_phone_mode'),
            [
                { text: i18n.t('share_files'), onPress: () => onSelectPhone('host') },
                { text: i18n.t('receive_files'), onPress: () => onSelectPhone('join') },
                { text: i18n.t('cancel'), style: 'cancel' },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.appName}>{i18n.t('app_name')}</Text>
                    <Text style={styles.appSubtitle}>{i18n.t('subtitle')}</Text>
                </View>
                <TouchableOpacity onPress={onSettings} style={styles.settingsButton}>
                    <Feather name="settings" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>{i18n.t('connect_mode_title')}</Text>
                <Text style={styles.subtitle}>{i18n.t('connect_mode_subtitle')}</Text>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onSelectPC}
                    >
                        <GlassView style={styles.optionCard} contentStyle={{ alignItems: 'center' }}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Feather name="monitor" size={48} color={colors.primary} />
                            </View>
                            <Text style={styles.optionTitle}>{i18n.t('connect_to_pc')}</Text>
                            <Text style={styles.optionDescription}>{i18n.t('connect_to_pc_desc')}</Text>
                        </GlassView>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handlePhoneMode}
                    >
                        <GlassView style={styles.optionCard} contentStyle={{ alignItems: 'center' }}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
                                <Feather name="smartphone" size={48} color={colors.secondary} />
                            </View>
                            <Text style={styles.optionTitle}>{i18n.t('connect_to_phone')}</Text>
                            <Text style={styles.optionDescription}>{i18n.t('connect_to_phone_desc')}</Text>
                        </GlassView>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onSelectMirror}
                    >
                        <GlassView style={styles.optionCard} contentStyle={{ alignItems: 'center' }}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FF980020' }]}>
                                <Feather name="cast" size={48} color="#FF9800" />
                            </View>
                            <Text style={styles.optionTitle}>{i18n.t('screen_mirroring')}</Text>
                            <Text style={styles.optionDescription}>{i18n.t('mirror_desc')}</Text>
                        </GlassView>
                    </TouchableOpacity>
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
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
    },
    appName: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    appSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    settingsButton: {
        padding: 8,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 40,
        textAlign: 'center',
        lineHeight: 22,
    },
    optionsContainer: {
        width: '100%',
        gap: 20,
    },
    optionCard: {
        // backgroundColor: colors.card, // Removed for glass effect
        borderRadius: 20,
        padding: 24,
        // borderWidth: 1, // Removed for glass effect
        // borderColor: colors.border, // Removed for glass effect
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    optionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
