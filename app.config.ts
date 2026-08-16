// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle/package identifiers must only include letters, digits and periods.
// Android also requires every period-separated segment to start with a letter.
const rawBundleId = "com.app.moveandfix";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "com.app.moveandfix";

// This is the single deep-link and payment-return scheme shipped by Move&Fix.
const moveAndFixScheme = "moveandfix";
// The actual Apple Pay merchant registration remains an external production gate.
const stripeMerchantIdentifier = "merchant.com.moveandfix";

const env = {
  // App branding is intentionally source-controlled rather than environment-dependent.
  appName: "Move&Fix",
  appSlug: "move-and-fix",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663875455116/EHwKtCbZUjvNkcyU.png",
  scheme: moveAndFixScheme,
  stripeMerchantIdentifier,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false,
      "NSLocationWhenInUseUsageDescription": "Move&Fix, aktif hizmet sırasında konumunuzu canlı takip, varış bilgisi ve yakındaki profesyoneller için kullanır.",
      "NSMicrophoneUsageDescription": "Move&Fix, yalnızca seçtiğiniz sohbet mesajını sesli kaydetmeniz için mikrofona erişir."
    }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "POST_NOTIFICATIONS", "RECORD_AUDIO"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    privacyPolicyUrl: "https://moveandfix.app/privacy-policy",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    "expo-notifications",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Move&Fix, aktif hizmet sırasında konumunuzu canlı takip ve varış bilgisi için kullanır.",
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: env.stripeMerchantIdentifier,
        enableGooglePay: false,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Move&Fix, yalnızca seçtiğiniz sohbet mesajını sesli kaydetmeniz için mikrofona erişir.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
