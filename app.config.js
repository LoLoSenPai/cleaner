import 'dotenv/config'

export default {
  expo: {
    name: 'cleaner',
    slug: 'cleaner',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/splash/icon.png',
    scheme: 'cleaner',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/splash/icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.lolosenpai.cleaner',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/splash/favicon/favicon.png',
    },

    plugins: [
      'expo-router',
      ['./plugins/with-svmwa-queries'],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#000000',
          image: './assets/splash/icon.png',
          imageWidth: 300,
          resizeMode: 'contain',
        },
      ],
      'expo-web-browser',
      'expo-font',
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
      router: {},
      eas: {},
    },
  },
}
