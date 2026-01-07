import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Feather from '../components/CustomFeather';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import AppVersion from '../components/AppVersion';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
    const { colors, isDark, toggleTheme, language, setLanguage } = useTheme();
    const { logout, user } = useAuth();
    const styles = getStyles(colors, isDark, language);

    const handleSignOut = async () => {
        try {
            await logout();
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error) {
            console.error(error);
            Alert.alert(i18n.t('error'), i18n.t('logout_failed'));
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.title}>{i18n.t('settings')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Welcome Section */}
                <View style={styles.section}>
                    <Text style={styles.welcomeText}>
                        {i18n.t('welcome_user', { name: user?.name || user?.username || 'User' })}
                    </Text>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('appearance')}</Text>
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[styles.optionButton, !isDark && styles.optionSelected]}
                            onPress={() => isDark && toggleTheme()}
                        >
                            <Text style={[styles.optionText, !isDark && styles.optionTextSelected]}>{i18n.t('light')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, isDark && styles.optionSelected]}
                            onPress={() => !isDark && toggleTheme()}
                        >
                            <Text style={[styles.optionText, isDark && styles.optionTextSelected]}>{i18n.t('dark')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Language Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{i18n.t('language')}</Text>
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={[styles.optionButton, language === 'en' && styles.optionSelected]}
                            onPress={() => setLanguage('en')}
                        >
                            <Text style={[styles.optionText, language === 'en' && styles.optionTextSelected]}>English</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, language === 'ar' && styles.optionSelected]}
                            onPress={() => setLanguage('ar')}
                        >
                            <Text style={[styles.optionText, language === 'ar' && styles.optionTextSelected]}>العربية</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Section */}
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>{i18n.t('sign_out')}</Text>
                </TouchableOpacity>

                {/* Privacy Policy Link */}
                <TouchableOpacity
                    style={styles.privacyButton}
                    onPress={() => navigation.navigate('Privacy', { origin: 'Settings' })}
                >
                    <Text style={styles.privacyText}>{i18n.t('privacy_policy')}</Text>
                </TouchableOpacity>

                {/* Version Info */}
                <AppVersion style={styles.version} />
            </ScrollView>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: colors.text,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        marginBottom: 16,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    welcomeText: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: colors.primary,
        marginBottom: 8,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    optionsContainer: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 4,
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
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
        fontFamily: Fonts.regular,
        fontSize: 14,
    },
    optionTextSelected: {
        color: colors.text,
        fontFamily: Fonts.bold,
    },
    signOutButton: {
        backgroundColor: colors.error,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    signOutText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    privacyButton: {
        marginTop: 24,
        alignItems: 'center',
    },
    privacyText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontFamily: Fonts.regular,
        textDecorationLine: 'underline',
    },
    version: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 13,
        fontFamily: Fonts.regular,
        marginTop: 40,
        opacity: 0.5,
    },
});


