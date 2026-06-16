import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thru.userapp',
  appName: 'Thru User App',
  webDir: 'out',
  server: {
    url: 'https://app.kiptech.in',
    cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https'
  }
};

export default config;
