import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { ScreenCaptureModule } = NativeModules;

interface ScreenCaptureInterface {
    startCapture(ip: string, port: number, quality: 'high' | 'low'): Promise<boolean>;
    stopCapture(): Promise<boolean>;
}

// Track state in JS to avoid duplicate native calls that error out.
let isCapturing = false;
let startInFlight: Promise<boolean> | null = null;

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
        // If we're already capturing (or starting), don't spam native again.
        if (isCapturing && !startInFlight) {
            return true;
        }
        if (startInFlight) {
            return startInFlight;
        }

        if (!ScreenCaptureModule) {
            console.warn('Screen mirroring native module not available. Use production build (Expo dev client or standalone).');
            return false;
        }

        // Android 13+ requires POST_NOTIFICATIONS for foreground services.
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const notifGranted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
            if (notifGranted !== PermissionsAndroid.RESULTS.GRANTED) {
                console.warn('Notification permission required for screen capture.');
                return false;
            }
        }

        console.log(`[${Platform.OS}] Starting screen capture to ${ip}:${port}`);

        startInFlight = Service.startCapture(ip, port, quality)
            .then(success => {
                isCapturing = success;
                return success;
            })
            .catch(error => {
                console.error('Failed to start capture:', error);
                isCapturing = false;
                return false;
            })
            .finally(() => {
                startInFlight = null;
            });

        return startInFlight;
    },

    stop: async (): Promise<boolean> => {
        try {
            if (!ScreenCaptureModule) return false;
            const result = await Service.stopCapture();
            isCapturing = false;
            return result;
        } catch (error) {
            console.error('Failed to stop capture:', error);
            isCapturing = false;
            return false;
        }
    }
};
