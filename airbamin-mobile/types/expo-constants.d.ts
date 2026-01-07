declare module 'expo-constants' {
  interface ExpoConfig {
    expo?: {
      version?: string;
    };
    version?: string;
  }

  interface Constants {
    expoConfig?: ExpoConfig;
    manifest?: any;
    manifest2?: any;
    statusBarHeight?: number;
    platform?: {
      ios?: { buildNumber?: string };
      android?: { versionCode?: number };
    };
  }

  const constants: Constants;
  export default constants;
}
