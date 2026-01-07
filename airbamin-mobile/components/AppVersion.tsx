import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import Constants from 'expo-constants';
import i18n from '../services/i18n';

interface Props {
    style?: StyleProp<TextStyle>;
}

export default function AppVersion({ style }: Props) {
    const version = Constants.expoConfig?.version || '1.0.0';

    return (
        <Text style={[styles.text, style]}>
            {i18n.t('version')} {version}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
    },
});
