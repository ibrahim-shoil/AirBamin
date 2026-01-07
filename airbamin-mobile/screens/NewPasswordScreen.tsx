import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import Icon from '../components/CustomFeather';
import Ionicons from '../components/CustomIonicons';
import i18n from '../services/i18n';
import AuthService from '../services/AuthService';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'NewPassword'>;

export default function NewPasswordScreen({ navigation, route }: Props) {
    const { emailOrUsername, code } = route.params;
    const { colors, isDark, language } = useTheme();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const styles = getStyles(colors, isDark, language);

    const validatePassword = (pass: string) => {
        const hasLetter = /[a-zA-Z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        return pass.length >= 8 && hasLetter && hasNumber;
    };

    const handleResetPassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert(i18n.t('error'), i18n.t('enter_all_fields'));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(i18n.t('error'), i18n.t('passwords_do_not_match'));
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert(i18n.t('error'), i18n.t('weak_password'));
            return;
        }

        setLoading(true);
        try {
            const response = await AuthService.resetPassword(emailOrUsername, code, password);
            if (response.ok) {
                Alert.alert(i18n.t('success'), i18n.t('password_reset_success'), [
                    { text: 'OK', onPress: () => navigation.replace('Login') }
                ]);
            } else {
                let errorMessage = i18n.t('reset_failed');
                if (response.error === 'code_expired') {
                    errorMessage = i18n.t('code_expired');
                } else if (response.error === 'invalid_code') {
                    errorMessage = i18n.t('invalid_code');
                }
                Alert.alert(i18n.t('error'), errorMessage);
            }
        } catch (error) {
            console.error(error);
            Alert.alert(i18n.t('error'), i18n.t('reset_failed'));
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
                    <Text style={styles.title}>{i18n.t('new_password')}</Text>
                    <Text style={styles.subtitle}>{i18n.t('enter_new_password')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Icon name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('new_password')}
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <Icon name="lock" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('confirm_password')}
                            placeholderTextColor={colors.textSecondary}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                        <Icon name="lock" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.resetButtonText}>{i18n.t('reset_password')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        direction: 'ltr',
    },
    inputIconRight: {
        marginLeft: 12,
    },
    input: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
        fontFamily: Fonts.regular,
        textAlign: 'left',
        paddingHorizontal: 8,
    },
    resetButton: {
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
    resetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});
