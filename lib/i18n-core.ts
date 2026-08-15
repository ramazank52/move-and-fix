export type Language = "tr" | "en" | "de" | "fr" | "ar";
export type SupportedCurrency = "TRY";

export const LANGUAGES: { code: Language; name: string; nativeName: string; locale: string; isRTL: boolean }[] = [
  { code: "tr", name: "Turkish", nativeName: "Türkçe", locale: "tr-TR", isRTL: false },
  { code: "en", name: "English", nativeName: "English", locale: "en-US", isRTL: false },
  { code: "de", name: "German", nativeName: "Deutsch", locale: "de-DE", isRTL: false },
  { code: "fr", name: "French", nativeName: "Français", locale: "fr-FR", isRTL: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", locale: "ar", isRTL: true },
];

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string; locale: string }[] = [
  { code: "TRY", label: "Türk lirası (TRY)", locale: "tr-TR" },
];

export type TranslationKey =
  | "home" | "explore" | "myJobs" | "messages" | "profile" | "search" | "categories" | "topRated" | "viewAll"
  | "serviceRequest" | "findProvider" | "login" | "register" | "logout" | "settings" | "premium" | "notifications"
  | "aiAssistant" | "active" | "pending" | "completed" | "cancelled" | "language" | "currency" | "wallet" | "restartRequired";

const translations: Record<Language, Record<TranslationKey, string>> = {
  tr: { home: "Ana Sayfa", explore: "Keşfet", myJobs: "İşlerim", messages: "Mesajlar", profile: "Profil", search: "Hizmet veya usta ara...", categories: "Hizmet Kategorileri", topRated: "En Yüksek Puanlı", viewAll: "Tümü", serviceRequest: "Hizmet Talebi", findProvider: "Usta Bul", login: "Giriş Yap", register: "Kayıt Ol", logout: "Çıkış Yap", settings: "Ayarlar", premium: "Premium Üyelik", notifications: "Bildirimler", aiAssistant: "MoveAI Asistan", active: "Aktif", pending: "Bekleyen", completed: "Tamamlanan", cancelled: "İptal", language: "Dil", currency: "Para Birimi", wallet: "MoveWallet", restartRequired: "Yön değişikliğinin uygulanması için uygulamayı yeniden açın." },
  en: { home: "Home", explore: "Explore", myJobs: "My Jobs", messages: "Messages", profile: "Profile", search: "Search for services or providers...", categories: "Service Categories", topRated: "Top Rated", viewAll: "View All", serviceRequest: "Service Request", findProvider: "Find Provider", login: "Login", register: "Register", logout: "Log out", settings: "Settings", premium: "Premium Membership", notifications: "Notifications", aiAssistant: "MoveAI Assistant", active: "Active", pending: "Pending", completed: "Completed", cancelled: "Cancelled", language: "Language", currency: "Currency", wallet: "MoveWallet", restartRequired: "Reopen the app to apply the direction change." },
  de: { home: "Startseite", explore: "Entdecken", myJobs: "Meine Aufträge", messages: "Nachrichten", profile: "Profil", search: "Dienste oder Anbieter suchen...", categories: "Dienstkategorien", topRated: "Am besten bewertet", viewAll: "Alle anzeigen", serviceRequest: "Serviceanfrage", findProvider: "Anbieter finden", login: "Anmelden", register: "Registrieren", logout: "Abmelden", settings: "Einstellungen", premium: "Premium-Mitgliedschaft", notifications: "Benachrichtigungen", aiAssistant: "MoveAI Assistent", active: "Aktiv", pending: "Ausstehend", completed: "Abgeschlossen", cancelled: "Storniert", language: "Sprache", currency: "Währung", wallet: "MoveWallet", restartRequired: "Öffnen Sie die App erneut, um die Richtungsänderung anzuwenden." },
  fr: { home: "Accueil", explore: "Explorer", myJobs: "Mes travaux", messages: "Messages", profile: "Profil", search: "Rechercher des services ou prestataires...", categories: "Catégories de services", topRated: "Les mieux notés", viewAll: "Voir tout", serviceRequest: "Demande de service", findProvider: "Trouver un prestataire", login: "Connexion", register: "Inscription", logout: "Déconnexion", settings: "Paramètres", premium: "Abonnement Premium", notifications: "Notifications", aiAssistant: "Assistant MoveAI", active: "Actif", pending: "En attente", completed: "Terminé", cancelled: "Annulé", language: "Langue", currency: "Devise", wallet: "MoveWallet", restartRequired: "Rouvrez l’application pour appliquer le changement de direction." },
  ar: { home: "الرئيسية", explore: "استكشاف", myJobs: "أعمالي", messages: "الرسائل", profile: "الملف الشخصي", search: "ابحث عن خدمات أو مقدمي خدمات...", categories: "فئات الخدمات", topRated: "الأعلى تقييماً", viewAll: "عرض الكل", serviceRequest: "طلب خدمة", findProvider: "ابحث عن مقدم خدمة", login: "تسجيل الدخول", register: "إنشاء حساب", logout: "تسجيل الخروج", settings: "الإعدادات", premium: "العضوية المميزة", notifications: "الإشعارات", aiAssistant: "مساعد MoveAI", active: "نشط", pending: "قيد الانتظار", completed: "مكتمل", cancelled: "ملغى", language: "اللغة", currency: "العملة", wallet: "MoveWallet", restartRequired: "أعد فتح التطبيق لتطبيق تغيير الاتجاه." },
};

let currentLanguage: Language = "tr";

export function setLanguage(lang: Language) { currentLanguage = lang; }
export function getLanguage(): Language { return currentLanguage; }
export function t(key: TranslationKey, language = currentLanguage): string { return translations[language]?.[key] ?? translations.tr[key] ?? key; }
export function localeForLanguage(language: Language) { return LANGUAGES.find((item) => item.code === language)?.locale ?? "tr-TR"; }
export function isRightToLeft(language: Language) { return LANGUAGES.find((item) => item.code === language)?.isRTL ?? false; }
export function formatMoney(amount: number, language: Language = currentLanguage) { return new Intl.NumberFormat(localeForLanguage(language), { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount); }
export function formatLocalDate(value: Date | string | number, language: Language = currentLanguage) { return new Intl.DateTimeFormat(localeForLanguage(language), { dateStyle: "medium" }).format(new Date(value)); }
