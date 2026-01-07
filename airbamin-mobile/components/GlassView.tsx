import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface GlassViewProps {
    children: React.ReactNode;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    intensity?: number;
    gradientColors?: [string, string, ...string[]];
}

export default function GlassView({ children, style, contentStyle, intensity = 50, gradientColors }: GlassViewProps) {
    const { colors, isDark } = useTheme();

    // Default gradient based on theme
    // Android needs more opaque backgrounds since BlurView support is limited
    const defaultGradient: [string, string] = Platform.OS === 'android'
        ? isDark
            ? ['rgba(30, 30, 30, 0.85)', 'rgba(20, 20, 20, 0.8)']
            : ['rgba(255, 255, 255, 0.85)', 'rgba(240, 240, 240, 0.8)']
        : isDark
            ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
            : ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.3)'];

    const activeGradient = gradientColors || defaultGradient;

    return (
        <View style={[styles.container, { borderColor: colors.glassBorder, shadowColor: colors.glassShadow }, style]}>
            {Platform.OS === 'ios' && (
                <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient
                colors={activeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.content, contentStyle]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderWidth: 1,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 10, // Android shadow
    },
    content: {
        zIndex: 1,
    },
});
