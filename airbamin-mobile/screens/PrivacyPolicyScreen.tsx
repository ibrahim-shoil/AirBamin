import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/CustomFeather';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

export default function PrivacyPolicyScreen({ navigation, route }: Props) {
    const { colors, isDark, language } = useTheme();
    const styles = getStyles(colors, isDark, language);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>{i18n.t('privacy_policy')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>{i18n.t('privacy_intro_title')}</Text>
                <Text style={styles.text}>
                    {i18n.t('privacy_intro_text')}
                </Text>

                <Text style={styles.sectionTitle}>{i18n.t('privacy_data_title')}</Text>
                <Text style={styles.text}>
                    {i18n.t('privacy_data_text')}
                </Text>

                <Text style={styles.sectionTitle}>{i18n.t('privacy_network_title')}</Text>
                <Text style={styles.text}>
                    {i18n.t('privacy_network_text')}
                </Text>

                <Text style={styles.sectionTitle}>{i18n.t('privacy_camera_title')}</Text>
                <Text style={styles.text}>
                    {i18n.t('privacy_camera_text')}
                </Text>

                <Text style={styles.sectionTitle}>{i18n.t('privacy_contact_title')}</Text>
                <Text style={styles.text}>
                    {i18n.t('privacy_contact_text')}
                </Text>

                <TouchableOpacity
                    style={styles.visitButton}
                    onPress={() => Linking.openURL(`https://tecbamin.com/airbamin/privacy/${language === 'ar' ? 'ar' : 'en'}`)}
                >
                    <Text style={styles.visitButtonText}>
                        {i18n.t('view_full_policy')}
                    </Text>
                </TouchableOpacity>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        color: colors.text,
        fontSize: 20,
        fontFamily: Fonts.bold,
        textAlign: 'left',
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 18,
        fontFamily: Fonts.bold,
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'left',
    },
    text: {
        color: colors.textSecondary,
        fontSize: 16,
        fontFamily: Fonts.regular,
        lineHeight: 24,
        textAlign: 'left',
    },
    visitButton: {
        marginTop: 32,
        marginBottom: 20,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignSelf: 'center',
    },
    visitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
        textAlign: 'center',
    },
});


