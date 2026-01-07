import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../components/CustomFeather';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../services/i18n';
import { ThemeColors, Fonts } from '../constants/Colors';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
    const { colors, isDark, language } = useTheme();
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const validatePassword = (pass: string) => {
        const hasLetter = /[a-zA-Z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        return pass.length >= 8 && hasLetter && hasNumber;
    };

    const handleSignUp = async () => {
        if (!name || !username || !email || !password || !confirmPassword) {
            Alert.alert(i18n.t('error'), i18n.t('enter_all_fields'));
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(i18n.t('error'), i18n.t('passwords_do_not_match'));
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert(i18n.t('error'), i18n.t('weak_password') + '\n' + 'Must be at least 8 characters with letters and numbers.');
            return;
        }

        setLoading(true);
        try {
            const response = await register(name, username, email, password);
            if (response.ok) {
                if (response.verification_required) {
                    navigation.navigate('VerifyEmail', { email });
                } else {
                    Alert.alert(i18n.t('success'), i18n.t('account_created'), [
                        { text: 'OK', onPress: () => navigation.replace('Mode') }
                    ]);
                }
            } else {
                let errorMessage = i18n.t('signup_failed');
                if (response.error === 'email_in_use' || response.error === 'email_exists') {
                    errorMessage = i18n.t('email_in_use');
                } else if (response.error === 'username_in_use' || response.error === 'username_exists' || response.error === 'username_taken') {
                    // Show suggested username if available
                    if (response.suggested_username) {
                        Alert.alert(
                            i18n.t('error'),
                            i18n.t('username_in_use') + '\n\n' + i18n.t('suggested_username') + ': ' + response.suggested_username,
                            [
                                { text: i18n.t('cancel'), style: 'cancel' },
                                { text: i18n.t('use_suggestion'), onPress: () => setUsername(response.suggested_username!) }
                            ]
                        );
                        return;
                    }
                    errorMessage = i18n.t('username_in_use');
                } else if (response.error === 'invalid_email') {
                    errorMessage = i18n.t('invalid_email');
                } else if (response.error === 'weak_password') {
                    errorMessage = i18n.t('weak_password');
                }
                Alert.alert(i18n.t('error'), errorMessage);
            }
        } catch (error) {
            console.error(error);
            Alert.alert(i18n.t('error'), i18n.t('signup_failed'));
        } finally {
            setLoading(false);
        }
    };

    const styles = getStyles(colors, isDark, language);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>


                <View style={styles.headerContainer}>
                    <Text style={styles.title}>{i18n.t('create_account')}</Text>
                    <Text style={styles.subtitle}>{i18n.t('sign_up_subtitle')}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('username')}
                            placeholderTextColor={colors.textSecondary}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                        <Icon name="user" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('name')}
                            placeholderTextColor={colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />
                        <Icon name="user" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('email')}
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Icon name="mail" size={20} color={colors.textSecondary} style={styles.inputIconRight} />
                    </View>

                    <View style={styles.inputContainer}>
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Icon name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder={i18n.t('password')}
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

                    <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.signUpButtonText}>{i18n.t('sign_up')}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>{i18n.t('already_have_account')} </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>{i18n.t('login')}</Text>
                        </TouchableOpacity>
                    </View>
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
        padding: 24,
    },
    headerContainer: {
        marginBottom: 32,
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 8,
        textAlign: 'left',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: colors.textSecondary,
        textAlign: 'left',
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
    signUpButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    signUpButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    loginContainer: {
        flexDirection: language === 'ar' ? 'row-reverse' : 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    loginText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
    loginLink: {
        color: colors.primary,
        fontSize: 14,
        fontFamily: Fonts.bold,
    },
});


