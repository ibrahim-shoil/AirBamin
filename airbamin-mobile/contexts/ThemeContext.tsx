import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import i18n from '../services/i18n';
import { Colors, ThemeColors } from '../constants/Colors';

type ThemeType = 'light' | 'dark' | 'system';
type LanguageType = 'en' | 'ar';

interface ThemeContextType {
    theme: ThemeType;
    language: LanguageType;
    colors: ThemeColors;
    isDark: boolean;
    setTheme: (theme: ThemeType) => void;
    toggleTheme: () => void;
    setLanguage: (lang: LanguageType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    language: 'en',
    colors: Colors.dark,
    isDark: true,
    setTheme: () => { },
    toggleTheme: () => { },
    setLanguage: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>('system');
    const [language, setLanguageState] = useState<LanguageType>('en');

    // Load saved preferences
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            const savedLang = await AsyncStorage.getItem('language');

            if (savedTheme) setThemeState(savedTheme as ThemeType);
            if (savedLang) {
                setLanguageState(savedLang as LanguageType);
                i18n.locale = savedLang;
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem('theme', newTheme);
    };

    const setLanguage = async (newLang: LanguageType) => {
        setLanguageState(newLang);
        i18n.locale = newLang;
        await AsyncStorage.setItem('language', newLang);

        const isRTL = newLang === 'ar';
        if (I18nManager.isRTL !== isRTL) {
            I18nManager.allowRTL(isRTL);
            I18nManager.forceRTL(isRTL);
            // Reload app to apply RTL changes
            Updates.reloadAsync();
        }
    };

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const isDark =
        theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';

    const colors = isDark ? Colors.dark : Colors.light;

    return (
        <ThemeContext.Provider
            value={{
                theme,
                language,
                colors,
                isDark,
                setTheme,
                toggleTheme,
                setLanguage,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
