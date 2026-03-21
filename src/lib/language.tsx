import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type LanguageCode = "en" | "hi";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (next: LanguageCode) => void;
  t: TranslateFn;
};

const STORAGE_KEY = "ezebuddies.language";

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    "common.language": "Language",
    "lang.en": "English",
    "lang.hi": "Hindi",

    "header.home": "Home",
    "header.useCases": "Use-cases",
    "header.products": "Products",
    "header.aboutUs": "About Us",
    "header.solutions": "Solutions",
    "header.talkToSales": "Talk to Sales",
    "header.login": "Login",

    "login.title": "Login",
    "login.description": "Enter your username and password.",
    "login.username": "Username",
    "login.usernamePlaceholder": "Enter username",
    "login.password": "Password",
    "login.passwordPlaceholder": "Enter password",
    "login.forgotPassword": "Forgot password?",
    "login.signIn": "Sign In",
    "login.signingIn": "Signing In...",

    "forgot.title": "Forgot Password",
    "forgot.description": "Enter user ID or email to receive reset password instructions.",
    "forgot.userId": "User ID",
    "forgot.userIdPlaceholder": "e.g. ritesh_farms",
    "forgot.email": "Email",
    "forgot.emailPlaceholder": "you@example.com",
    "forgot.helperText": "Submit with either user ID or email.",
    "forgot.submit": "Submit",
    "forgot.submitting": "Submitting...",

    "toast.loginApiNotConfigured.title": "Login API not configured",
    "toast.loginApiNotConfigured.description": "Set VITE_LOGIN_API_URL in your environment file.",
    "toast.loginSuccess.title": "Login successful",
    "toast.loginSuccess.description": "Welcome. Redirecting to dashboard.",
    "toast.loginFailed.title": "Login failed",
    "toast.loginFailed.description": "Please check username/password and try again.",
    "toast.forgotMissing.title": "Missing details",
    "toast.forgotMissing.description": "Please enter user ID or email.",
    "toast.forgotSuccess.title": "Reset link sent",
    "toast.forgotSuccess.description": "Reset password mail sent to registered email.",
    "toast.forgotFailed.title": "Request failed",
    "toast.forgotNetwork.description": "Network/CORS error. Please check backend CORS for this domain.",
    "toast.forgotFallback.description": "Could not process forgot password request.",

    "index.prelaunch.badge": "PRE LAUNCH",
    "index.prelaunch.subtitle": "Smart Climate Control & Monitoring Device",
    "index.prelaunch.title": "Get Early Access",
    "index.prelaunch.description": "Be among the first to deploy Vatavaran Monitor for climate automation.",
    "index.prelaunch.interested": "I'm Interested",
    "index.prelaunch.maybeLater": "Maybe Later",

    "dashboard.navTitle": "Navigation",
    "dashboard.welcome": "Welcome, {{name}}",
    "dashboard.notAvailable": "Not available",
    "dashboard.logout": "Logout",
    "dashboard.title": "ezeGreen Dashboard",
    "dashboard.refreshNow": "Refresh Now",
    "dashboard.refreshing": "Refreshing...",
    "dashboard.deviceSummaryTitle": "Device Summary",
    "dashboard.deviceSummaryDescription": "Device distribution based on device name",
    "dashboard.noDevices": "No devices found in login response.",
    "dashboard.quantity": "Quantity",
    "dashboard.sensor": "Sensor",
    "dashboard.actuator": "Actuator",
    "dashboard.deployedAt": "Deployed At",
    "dashboard.notSpecified": "Not specified",
    "dashboard.deviceId": "Device ID",
    "dashboard.relayBoard": "Relay 8 Channel Board",
    "dashboard.temperature": "Temperature",
    "dashboard.humidity": "Humidity",
    "dashboard.co2": "CO2",
    "dashboard.liveDataFailed.title": "Live data update failed",
    "dashboard.liveDataFailed.description": "Unable to refresh device data right now.",
  },
  hi: {
    "common.language": "भाषा",
    "lang.en": "अंग्रेज़ी",
    "lang.hi": "हिंदी",

    "header.home": "होम",
    "header.useCases": "उपयोग के मामले",
    "header.products": "प्रोडक्ट्स",
    "header.aboutUs": "हमारे बारे में",
    "header.solutions": "समाधान",
    "header.talkToSales": "सेल्स से बात करें",
    "header.login": "लॉगिन",

    "login.title": "लॉगिन",
    "login.description": "अपना यूज़रनेम और पासवर्ड दर्ज करें।",
    "login.username": "यूज़रनेम",
    "login.usernamePlaceholder": "यूज़रनेम दर्ज करें",
    "login.password": "पासवर्ड",
    "login.passwordPlaceholder": "पासवर्ड दर्ज करें",
    "login.forgotPassword": "पासवर्ड भूल गए?",
    "login.signIn": "साइन इन",
    "login.signingIn": "साइन इन हो रहा है...",

    "forgot.title": "पासवर्ड भूल गए",
    "forgot.description": "रीसेट निर्देश पाने के लिए यूज़र आईडी या ईमेल दर्ज करें।",
    "forgot.userId": "यूज़र आईडी",
    "forgot.userIdPlaceholder": "उदाहरण: ritesh_farms",
    "forgot.email": "ईमेल",
    "forgot.emailPlaceholder": "you@example.com",
    "forgot.helperText": "यूज़र आईडी या ईमेल में से किसी एक के साथ सबमिट करें।",
    "forgot.submit": "सबमिट करें",
    "forgot.submitting": "सबमिट हो रहा है...",

    "toast.loginApiNotConfigured.title": "लॉगिन API कॉन्फ़िगर नहीं है",
    "toast.loginApiNotConfigured.description": "अपने environment file में VITE_LOGIN_API_URL सेट करें।",
    "toast.loginSuccess.title": "लॉगिन सफल",
    "toast.loginSuccess.description": "स्वागत है। डैशबोर्ड पर भेजा जा रहा है।",
    "toast.loginFailed.title": "लॉगिन असफल",
    "toast.loginFailed.description": "यूज़रनेम/पासवर्ड जांचकर फिर कोशिश करें।",
    "toast.forgotMissing.title": "जानकारी अधूरी है",
    "toast.forgotMissing.description": "कृपया यूज़र आईडी या ईमेल दर्ज करें।",
    "toast.forgotSuccess.title": "रीसेट लिंक भेजा गया",
    "toast.forgotSuccess.description": "पासवर्ड रीसेट मेल पंजीकृत ईमेल पर भेज दिया गया है।",
    "toast.forgotFailed.title": "अनुरोध असफल",
    "toast.forgotNetwork.description": "नेटवर्क/CORS समस्या। कृपया इस डोमेन के लिए backend CORS जांचें।",
    "toast.forgotFallback.description": "फॉरगॉट पासवर्ड अनुरोध प्रोसेस नहीं हो सका।",

    "index.prelaunch.badge": "प्री लॉन्च",
    "index.prelaunch.subtitle": "स्मार्ट क्लाइमेट कंट्रोल और मॉनिटरिंग डिवाइस",
    "index.prelaunch.title": "अर्ली एक्सेस पाएं",
    "index.prelaunch.description": "क्लाइमेट ऑटोमेशन के लिए वातावारण मॉनिटर को पहले अपनाने वालों में शामिल हों।",
    "index.prelaunch.interested": "मुझे रुचि है",
    "index.prelaunch.maybeLater": "शायद बाद में",

    "dashboard.navTitle": "नेविगेशन",
    "dashboard.welcome": "स्वागत है, {{name}}",
    "dashboard.notAvailable": "उपलब्ध नहीं",
    "dashboard.logout": "लॉगआउट",
    "dashboard.title": "ezeGreen डैशबोर्ड",
    "dashboard.refreshNow": "अभी रिफ्रेश करें",
    "dashboard.refreshing": "रिफ्रेश हो रहा है...",
    "dashboard.deviceSummaryTitle": "डिवाइस सारांश",
    "dashboard.deviceSummaryDescription": "डिवाइस नाम के आधार पर वितरण",
    "dashboard.noDevices": "लॉगिन रिस्पॉन्स में कोई डिवाइस नहीं मिला।",
    "dashboard.quantity": "मात्रा",
    "dashboard.sensor": "सेंसर",
    "dashboard.actuator": "एक्चुएटर",
    "dashboard.deployedAt": "तैनाती स्थान",
    "dashboard.notSpecified": "उल्लेख नहीं",
    "dashboard.deviceId": "डिवाइस आईडी",
    "dashboard.relayBoard": "रिले 8 चैनल बोर्ड",
    "dashboard.temperature": "तापमान",
    "dashboard.humidity": "आर्द्रता",
    "dashboard.co2": "CO2",
    "dashboard.liveDataFailed.title": "लाइव डेटा अपडेट असफल",
    "dashboard.liveDataFailed.description": "अभी डिवाइस डेटा रिफ्रेश नहीं हो पाया।",
  },
};

const languageOptions: Array<{ value: LanguageCode; labelKey: string }> = [
  { value: "en", labelKey: "lang.en" },
  { value: "hi", labelKey: "lang.hi" },
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function replaceVars(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function resolveInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "hi") return stored;
  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("hi")) return "hi";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => resolveInitialLanguage());

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dictionary = translations[language] ?? translations.en;
      const fallback = translations.en[key] ?? key;
      return replaceVars(dictionary[key] ?? fallback, vars);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

export function getLanguageOptions() {
  return languageOptions;
}
