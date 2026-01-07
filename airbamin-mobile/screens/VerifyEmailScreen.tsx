import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/CustomFeather';
import Ionicons from '../components/CustomIonicons';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ navigation, route }: Props) {
    const { email } = route.params;
    const { colors, isDark, language } = useTheme();
    const { verifyEmail } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const styles = getStyles(colors, isDark, language);

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert(i18n.t('error'), i18n.t('invalid_code'));
            return;
        }

        setLoading(true);
        try {
            const response = await verifyEmail(email, code);
            if (response.ok) {
                Alert.alert(i18n.t('success'), i18n.t('account_verified'), [
                    { text: 'OK', onPress: () => navigation.replace('Mode') }
                ]);
            } else {
                Alert.alert(i18n.t('error'), response.error || i18n.t('verification_failed'));
            }
        } catch (error) {
            console.error(error);
            Alert.alert(i18n.t('error'), i18n.t('verification_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name={language === 'ar' ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{i18n.t('verify_email')}</Text>
                    <Text style={styles.subtitle}>{i18n.t('enter_code_sent_to')} {email}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Icon name="key" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('enter_code')}
                            placeholderTextColor={colors.textSecondary}
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            maxLength={6}
                            autoFocus
                        />
                    </View>

                    <TouchableOpacity style={styles.verifyButton} onPress={handleVerify} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.verifyButtonText}>{i18n.t('verify')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const getStyles = (colors: ThemeColors, isDark: boolean, language: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    backButton: {
        padding: 20,
        alignSelf: language === 'ar' ? 'flex-end' : 'flex-start',
    },
    headerContainer: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        lineHeight: 24,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    inputContainer: {
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: {
        marginRight: language === 'ar' ? 0 : 12,
        marginLeft: language === 'ar' ? 12 : 0,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        fontFamily: Fonts.regular,
        textAlign: language === 'ar' ? 'right' : 'left',
    },
    verifyButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});


