import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, I18nManager } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import i18n from '../services/i18n';
import { ThemeColors } from '../constants/Colors';

interface SettingsScreenProps {
    onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
    const { colors, theme, language, setTheme, setLanguage, isDark } = useTheme();
    const styles = getStyles(colors, isDark, language);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{i18n.t('settings')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('language')}</Text>
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[styles.optionButton, language === 'en' && styles.optionSelected]}
                            onPress={() => setLanguage('en')}
                        >
                            <Text style={[styles.optionText, language === 'en' && styles.optionTextSelected]}>
                                {i18n.t('english')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, language === 'ar' && styles.optionSelected]}
                            onPress={() => setLanguage('ar')}
                        >
                            <Text style={[styles.optionText, language === 'ar' && styles.optionTextSelected]}>
                                {i18n.t('arabic')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('theme')}</Text>
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[styles.optionButton, theme === 'system' && styles.optionSelected]}
                            onPress={() => setTheme('system')}
                        >
                            <Text style={[styles.optionText, theme === 'system' && styles.optionTextSelected]}>
                                {i18n.t('auto')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, theme === 'light' && styles.optionSelected]}
                            onPress={() => setTheme('light')}
                        >
                            <Text style={[styles.optionText, theme === 'light' && styles.optionTextSelected]}>
                                {i18n.t('light')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, theme === 'dark' && styles.optionSelected]}
                            onPress={() => setTheme('dark')}
                        >
                            <Text style={[styles.optionText, theme === 'dark' && styles.optionTextSelected]}>
                                {i18n.t('dark')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.version}>{i18n.t('version')}</Text>
            </ScrollView>
        </View>
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, language: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 30,
        direction: language === 'ar' ? 'rtl' : 'ltr',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        fontSize: 24,
        color: colors.primary,
        fontWeight: 'bold',
        // Flip arrow for RTL
        transform: [{ scaleX: language === 'ar' ? -1 : 1 }],
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 16,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    optionsContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 4,
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: colors.border,
    },
    optionButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    optionSelected: {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    optionText: {
        color: colors.textSecondary,
        fontWeight: '500',
        fontSize: 14,
    },
    optionTextSelected: {
        color: colors.text,
        fontWeight: '700',
    },
    version: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 40,
        opacity: 0.5,
    },
});
