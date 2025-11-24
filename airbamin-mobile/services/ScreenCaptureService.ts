import { NativeModules, Platform } from 'react-native';

const { ScreenCaptureModule } = NativeModules;

interface ScreenCaptureInterface {
    startCapture(ip: string, port: number, quality: 'high' | 'low'): Promise<boolean>;
    stopCapture(): Promise<boolean>;
}

// Mock for development/Expo Go
const MockScreenCapture: ScreenCaptureInterface = {
    startCapture: async (ip, port, quality) => {
        console.log(`[Mock] Starting capture to ${ip}:${port} with ${quality} quality`);
        return new Promise(resolve => setTimeout(() => resolve(true), 1000));
    },
    stopCapture: async () => {
        console.log('[Mock] Stopping capture');
        return new Promise(resolve => setTimeout(() => resolve(true), 500));
    }
};

const Service: ScreenCaptureInterface = ScreenCaptureModule || MockScreenCapture;

export default {
    start: async (ip: string, port: number = 9091, quality: 'high' | 'low' = 'high'): Promise<boolean> => {
        try {
            // Allow mock on Android/Simulator
            if (Platform.OS !== 'ios' && ScreenCaptureModule) {
                console.warn('Screen mirroring is only supported on iOS for now.');
                return false;
            }
            return await Service.startCapture(ip, port, quality);
        } catch (error) {
            console.error('Failed to start capture:', error);
            return false;
        }
    },

    stop: async (): Promise<boolean> => {
        try {
            if (Platform.OS !== 'ios' && ScreenCaptureModule) return false;
            return await Service.stopCapture();
        } catch (error) {
            console.error('Failed to stop capture:', error);
            return false;
        }
    }
};
