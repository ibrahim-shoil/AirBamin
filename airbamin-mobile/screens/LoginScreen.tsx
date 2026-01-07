import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/AuthService';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginFailed, setLoginFailed] = useState(false);

    const handleForgotPassword = () => {
        // Get current email/username value at the time button is clicked
        const currentEmail = email.trim();

        if (!currentEmail) {
            Alert.alert(i18n.t('error'), i18n.t('enter_email_or_username_first'));
            return;
        }

        Alert.alert(
            i18n.t('forgot_password'),
            i18n.t('forgot_password_message') + '\n\n' + currentEmail,
            [
                { text: i18n.t('cancel'), style: 'cancel' },
                {
                    text: i18n.t('send_reset_link'),
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const response = await AuthService.requestPasswordReset(currentEmail);
                            if (response.ok) {
                                Alert.alert(i18n.t('success'), i18n.t('reset_link_sent'), [
                                    { text: 'OK', onPress: () => navigation.navigate('ResetCode', { emailOrUsername: currentEmail }) }
                                ]);
                            } else {
                                let errorMessage = i18n.t('reset_failed');
                                if (response.error === 'email_not_found') {
                                    errorMessage = i18n.t('email_not_found');
                                } else if (response.error === 'network_error') {
                                    errorMessage = i18n.t('connection_failed');
                                }
                                Alert.alert(i18n.t('error'), errorMessage);
                            }
                        } catch (error) {
                            console.error('Password reset error:', error);
                            Alert.alert(i18n.t('error'), i18n.t('reset_failed'));
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(i18n.t('error'), i18n.t('enter_all_fields'));
            return;
        }

        setLoading(true);
        setLoginFailed(false); // Reset before attempting login
        try {
            const response = await login(email, password);
            if (response.ok) {
                navigation.replace('Mode');
            } else if (response.verification_required) {
                navigation.navigate('VerifyEmail', { email });
            } else {
                let errorMessage = i18n.t('login_failed');
                if (response.error === 'invalid_credentials') {
                    errorMessage = i18n.t('invalid_credentials');
                    setLoginFailed(true); // Show forgot password link
                } else if (response.error === 'network_error') {
                    errorMessage = i18n.t('connection_failed');
                }
                Alert.alert(i18n.t('error'), errorMessage);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            // Better error handling for network/API errors
            let errorMessage = i18n.t('login_failed');
            if (error.response?.status === 401) {
                errorMessage = i18n.t('invalid_credentials');
                setLoginFailed(true); // Show forgot password link
            } else if (error.message?.includes('Network') || error.code === 'ECONNREFUSED') {
                errorMessage = i18n.t('connection_failed');
            }
            Alert.alert(i18n.t('error'), errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const styles = getStyles(colors, isDark, language);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>


                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../assets/icon.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.appName}>{i18n.t('app_name')}</Text>
                    <Text style={styles.tagline}>{i18n.t('subtitle')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('email_or_username')}
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Feather name="mail" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    <View style={styles.inputContainer}>
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('password')}
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <Feather name="lock" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    {loginFailed && (
                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
                            <Text style={styles.forgotPasswordText}>{i18n.t('forgot_password')}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>{i18n.t('login')}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>{i18n.t('or')}</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={styles.signUpButton} onPress={() => navigation.navigate('SignUp')}>
                        <Text style={styles.signUpButtonText}>{i18n.t('create_account')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Privacy', { origin: 'Login' })} style={styles.privacyLink}>
                        <Text style={styles.privacyText}>{i18n.t('privacy_policy')}</Text>
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
        justifyContent: 'center',
        padding: 24,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
        marginTop: 20,
    },

    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 20,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    appName: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: colors.border,
        direction: 'ltr',
    },
    inputIcon: {
        marginRight: 12,
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
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    signUpButton: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    signUpButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontFamily: Fonts.regular,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        direction: language === 'ar' ? 'rtl' : 'ltr',
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    dividerText: {
        color: colors.textSecondary,
        paddingHorizontal: 16,
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
    privacyLink: {
        alignItems: 'center',
    },
    privacyText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontFamily: Fonts.regular,
        textDecorationLine: 'underline',
    },
    forgotPasswordLink: {
        alignItems: language === 'ar' ? 'flex-start' : 'flex-end',
        marginTop: 8,
        marginBottom: 8,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
});


