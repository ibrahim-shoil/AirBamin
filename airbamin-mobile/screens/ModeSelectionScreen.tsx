import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
// Use custom Feather that works on Android
import Feather from '../components/CustomFeather';
import * as Font from 'expo-font';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import GlassView from '../components/GlassView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Mode'>;

export default function ModeSelectionScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const { user } = useAuth();
    const styles = getStyles(colors, isDark, language);

    // Debug: Check if icon fonts are loaded
    useEffect(() => {
        const checkFonts = async () => {
            const featherLoaded = await Font.isLoaded('Feather');
            const ioniconsLoaded = await Font.isLoaded('Ionicons');
            console.log('=== ICON FONT DEBUG ===');
            console.log('Platform:', Platform.OS);
            console.log('Feather font loaded:', featherLoaded);
            console.log('Ionicons font loaded:', ioniconsLoaded);

            // Also try checking with different font names
            const featherAlt = await Font.isLoaded('feather');
            const ioniconsAlt = await Font.isLoaded('ionicons');
            console.log('feather (lowercase) loaded:', featherAlt);
            console.log('ionicons (lowercase) loaded:', ioniconsAlt);
            console.log('======================');
        };
        checkFonts();
    }, []);

    const handlePhoneMode = () => {
        Alert.alert(
            i18n.t('connect_to_phone'),
            i18n.t('choose_phone_mode'),
            [
                { text: i18n.t('share_files'), onPress: () => navigation.navigate('Host') },
                { text: i18n.t('receive_files'), onPress: () => navigation.navigate('Join') },
                { text: i18n.t('cancel'), style: 'cancel' },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.appName}>{i18n.t('app_name')}</Text>
                    <Text style={styles.appSubtitle}>
                        {i18n.t('welcome_user', { name: user?.name || user?.username || 'User' })}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsButton}>
                    <Feather name="settings" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} style={styles.content}>
                <Text style={styles.title}>{i18n.t('connect_mode_title')}</Text>
                <Text style={styles.subtitle}>{i18n.t('connect_mode_subtitle')}</Text>

                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Connect')}
                    >
                        <GlassView style={styles.optionCard} contentStyle={{ alignItems: 'center' }}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Feather name="monitor" size={48} color={colors.primary} />
                            </View>
                            <Text style={styles.optionTitle}>{i18n.t('connect_to_pc')}</Text>
                            <Text style={styles.optionDescription}>{i18n.t('connect_to_pc_desc')}</Text>
                        </GlassView>
                    </TouchableOpacity>

                    {/* Phone-to-phone feature - hidden for initial release, will be enabled in future version
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
                    */}

                    {/* Download PC App Link */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(language === 'ar' ? 'https://tecbamin.com/airbamin' : 'https://tecbamin.com/airbamin/en')}
                    >
                        <GlassView style={styles.optionCard} contentStyle={{ alignItems: 'center' }}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                                <Feather name="download" size={48} color={colors.success || '#10B981'} />
                            </View>
                            <Text style={styles.optionTitle}>{i18n.t('download_pc_app')}</Text>
                            <Text style={styles.optionDescription}>{i18n.t('download_pc_app_desc')}</Text>
                        </GlassView>
                    </TouchableOpacity>

                </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
    },
    appName: {
        fontSize: 24,
        // fontWeight: '800', // Removed to use custom font
        fontFamily: Fonts.bold,
        color: colors.text,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    appSubtitle: {
        fontSize: 14,
        fontFamily: Fonts.regular,
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
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        // fontWeight: '700',
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: Fonts.regular,
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
        // fontWeight: '700',
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    optionDescription: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});


