import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User, AuthResponse } from '../services/AuthService';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<AuthResponse>;
    register: (name: string, username: string, email: string, password: string) => Promise<AuthResponse>;
    verifyEmail: (email: string, code: string) => Promise<AuthResponse>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSession();
    }, []);

    const loadSession = async () => {
        try {
            const storedToken = await authService.loadToken();
            const storedUser = await authService.getUser();
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(storedUser);
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<AuthResponse> => {
        setIsLoading(true);
        try {
            const response = await authService.login(email, password);
            if (response.ok && response.user && response.token) {
                setUser(response.user);
                setToken(response.token);
            }
            return response;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, username: string, email: string, password: string): Promise<AuthResponse> => {
        setIsLoading(true);
        try {
            const response = await authService.register(name, username, email, password);
            if (response.ok && !response.verification_required && response.user && response.token) {
                setUser(response.user);
                setToken(response.token);
            }
            return response;
        } finally {
            setIsLoading(false);
        }
    };

    const verifyEmail = async (email: string, code: string): Promise<AuthResponse> => {
        setIsLoading(true);
        try {
            const response = await authService.verifyEmail(email, code);
            if (response.ok && response.user && response.token) {
                setUser(response.user);
                setToken(response.token);
            }
            return response;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await authService.logout();
            setUser(null);
            setToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isLoading,
            isAuthenticated: !!token,
            login,
            register,
            verifyEmail,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
