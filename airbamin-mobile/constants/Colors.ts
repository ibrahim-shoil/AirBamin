export const Colors = {
    light: {
        background: '#F5F7FA', // Cloud White
        card: '#ffffff',
        text: '#1A1D21', // Void Black
        textSecondary: '#828282', // Slate Grey
        primary: '#2F80ED', // Electric Blue
        secondary: '#F2994A', // Solar Orange (Complementary)
        border: '#e5e5ea',
        success: '#34c759',
        error: '#EB5757', // Sunset Red
        overlay: 'rgba(0,0,0,0.5)',
        inputBg: '#f2f2f7',
        glassBg: 'rgba(255, 255, 255, 0.7)',
        glassBorder: 'rgba(255, 255, 255, 0.5)',
        glassShadow: 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
        background: '#1A1D21', // Void Black
        card: 'rgba(255, 255, 255, 0.08)',
        text: '#ffffff',
        textSecondary: '#a1a1aa',
        primary: '#2F80ED', // Electric Blue
        secondary: '#F2994A', // Solar Orange (Complementary)
        border: 'rgba(255, 255, 255, 0.1)',
        success: '#4ade80',
        error: '#ef4444',
        overlay: 'rgba(0,0,0,0.7)',
        inputBg: 'rgba(255, 255, 255, 0.1)',
        glassBg: 'rgba(30, 30, 30, 0.6)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        glassShadow: 'rgba(0, 0, 0, 0.3)',
    },
};

export const Fonts = {
    regular: 'Baloo-Regular',
    bold: 'Baloo-Bold',
};

export type ThemeColors = typeof Colors.light;
