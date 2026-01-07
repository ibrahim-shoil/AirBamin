import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = 'https://tecbamin.com/api';

export interface User {
    id: number;
    name: string;
    email: string;
    username?: string;
    plan?: string;
}

export interface AuthResponse {
    ok: boolean;
    token?: string;
    user?: User;
    error?: string;
    plan?: string;
    features?: string[];
    verification_required?: boolean;
    suggested_username?: string;
}

class AuthService {
    private token: string | null = null;

    async loadToken(): Promise<string | null> {
        this.token = await AsyncStorage.getItem('auth_token');
        return this.token;
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const deviceName = `${Platform.OS} Device`;

            const payload: any = {
                password,
                device_id: deviceName,
                platform: Platform.OS,
                app_version: '1.0.0'
            };

            if (email.includes('@')) {
                payload.email = email;
            } else {
                payload.username = email;
            }

            const response = await axios.post(`${API_URL}/mobile/login`, payload);

            return this.handleAuthResponse(response.data);
        } catch (error: any) {
            // Handle login errors gracefully
            const status = error.response?.status;
            const errorData = error.response?.data;

            if (status === 401) {
                console.log('Login failed: Invalid credentials');
                return {
                    ok: false,
                    error: 'invalid_credentials'
                };
            }

            if (errorData?.error === 'verification_required') {
                console.log('Login failed: Email verification required');
                return {
                    ok: false,
                    error: 'verification_required',
                    verification_required: true
                };
            }

            if (!error.response) {
                console.log('Login failed: Network error');
                return {
                    ok: false,
                    error: 'network_error'
                };
            }

            console.log('Login failed:', errorData?.error || 'unknown error');
            return {
                ok: false,
                error: errorData?.error || 'unknown_error'
            };
        }
    }

    async register(name: string, username: string, email: string, password: string): Promise<AuthResponse> {
        try {
            const deviceName = `${Platform.OS} Device`;
            const response = await axios.post(`${API_URL}/mobile/register`, {
                name,
                username,
                email,
                password,
                device_id: deviceName,
                platform: Platform.OS
            });

            if (response.data.verification_required) {
                return {
                    ok: true,
                    verification_required: true
                };
            }

            return this.handleAuthResponse(response.data);
        } catch (error: any) {
            console.error('Registration error:', error);
            if (error.response) {
                console.error('Registration error data:', error.response.data);
            }
            return {
                ok: false,
                error: error.response?.data?.error || 'network_error',
                suggested_username: error.response?.data?.suggested_username
            };
        }
    }

    async verifyEmail(email: string, code: string): Promise<AuthResponse> {
        try {
            const deviceName = `${Platform.OS} Device`;
            const response = await axios.post(`${API_URL}/mobile/verify`, {
                email,
                code,
                device_id: deviceName,
                platform: Platform.OS
            });

            return this.handleAuthResponse(response.data);
        } catch (error: any) {
            console.error('Verification error:', error);
            return {
                ok: false,
                error: error.response?.data?.error || 'network_error'
            };
        }
    }

    async requestPasswordReset(emailOrUsername: string): Promise<{ ok: boolean; error?: string }> {
        try {
            // Determine if input is email or username
            const payload: any = {};
            if (emailOrUsername.includes('@')) {
                payload.email = emailOrUsername;
            } else {
                payload.username = emailOrUsername;
            }

            const response = await axios.post(`${API_URL}/mobile/forgot-password`, payload);

            console.log('Password reset: Reset link sent successfully');
            return {
                ok: true
            };
        } catch (error: any) {
            const status = error.response?.status;
            const errorData = error.response?.data;

            if (status === 404) {
                console.log('Password reset failed: Email not found');
                return {
                    ok: false,
                    error: 'email_not_found'
                };
            }

            if (!error.response) {
                console.log('Password reset failed: Network error');
                return {
                    ok: false,
                    error: 'network_error'
                };
            }

            console.log('Password reset failed:', errorData?.error || 'unknown error');
            return {
                ok: false,
                error: errorData?.error || 'unknown_error'
            };
        }
    }

    async verifyResetCode(emailOrUsername: string, code: string): Promise<{ ok: boolean; error?: string }> {
        try {
            const payload: any = { code };
            if (emailOrUsername.includes('@')) {
                payload.email = emailOrUsername;
            } else {
                payload.username = emailOrUsername;
            }

            const response = await axios.post(`${API_URL}/mobile/verify-reset-code`, payload);
            return { ok: true };
        } catch (error: any) {
            const errorData = error.response?.data;
            console.log('Reset code verification failed:', errorData?.error || 'unknown error');
            return {
                ok: false,
                error: errorData?.error || 'invalid_code'
            };
        }
    }

    async resetPassword(emailOrUsername: string, code: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
        try {
            const payload: any = { code, password: newPassword };
            if (emailOrUsername.includes('@')) {
                payload.email = emailOrUsername;
            } else {
                payload.username = emailOrUsername;
            }

            const response = await axios.post(`${API_URL}/mobile/reset-password`, payload);
            console.log('Password reset successful');
            return { ok: true };
        } catch (error: any) {
            const errorData = error.response?.data;
            console.log('Password reset failed:', errorData?.error || 'unknown error');
            return {
                ok: false,
                error: errorData?.error || 'reset_failed'
            };
        }
    }

    async logout(): Promise<void> {
        this.token = null;
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
    }

    private async handleAuthResponse(data: any): Promise<AuthResponse> {
        if (data.ok && data.token) {
            this.token = data.token;
            await AsyncStorage.setItem('auth_token', data.token);

            // Construct user object from response if available, or basic info
            const user: User = data.user || {
                id: 0,
                name: data.name || 'User',
                email: data.email || '',
                plan: data.plan || 'free'
            };

            await AsyncStorage.setItem('user_data', JSON.stringify(user));

            return {
                ok: true,
                token: data.token,
                user,
                plan: data.plan,
                features: data.features
            };
        }

        return {
            ok: false,
            error: data.error || 'unknown_error'
        };
    }

    async getUser(): Promise<User | null> {
        const userData = await AsyncStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : null;
    }

    getToken(): string | null {
        return this.token;
    }
}

export default new AuthService();
