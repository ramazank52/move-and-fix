// Multi-language support for Move&Fix
export type Language = "tr" | "en" | "de" | "fr" | "ar";

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
];

type TranslationKey =
  | "home"
  | "explore"
  | "myJobs"
  | "messages"
  | "profile"
  | "search"
  | "categories"
  | "topRated"
  | "viewAll"
  | "serviceRequest"
  | "findProvider"
  | "login"
  | "register"
  | "logout"
  | "settings"
  | "premium"
  | "notifications"
  | "aiAssistant"
  | "active"
  | "pending"
  | "completed"
  | "cancelled";

const translations: Record<Language, Record<TranslationKey, string>> = {
  tr: {
    home: "Ana Sayfa",
    explore: "Keşfet",
    myJobs: "İşlerim",
    messages: "Mesajlar",
    profile: "Profil",
    search: "Hizmet veya usta ara...",
    categories: "Hizmet Kategorileri",
    topRated: "En Yüksek Puanlı",
    viewAll: "Tümü",
    serviceRequest: "Hizmet Talebi",
    findProvider: "Usta Bul",
    login: "Giriş Yap",
    register: "Kayıt Ol",
    logout: "Çıkış Yap",
    settings: "Ayarlar",
    premium: "Premium Üyelik",
    notifications: "Bildirimler",
    aiAssistant: "MoveAI Asistan",
    active: "Aktif",
    pending: "Bekleyen",
    completed: "Tamamlanan",
    cancelled: "İptal",
  },
  en: {
    home: "Home",
    explore: "Explore",
    myJobs: "My Jobs",
    messages: "Messages",
    profile: "Profile",
    search: "Search for services or providers...",
    categories: "Service Categories",
    topRated: "Top Rated",
    viewAll: "View All",
    serviceRequest: "Service Request",
    findProvider: "Find Provider",
    login: "Login",
    register: "Register",
    logout: "Logout",
    settings: "Settings",
    premium: "Premium Membership",
    notifications: "Notifications",
    aiAssistant: "MoveAI Assistant",
    active: "Active",
    pending: "Pending",
    completed: "Completed",
    cancelled: "Cancelled",
  },
  de: {
    home: "Startseite",
    explore: "Entdecken",
    myJobs: "Meine Aufträge",
    messages: "Nachrichten",
    profile: "Profil",
    search: "Dienste oder Anbieter suchen...",
    categories: "Dienstkategorien",
    topRated: "Am besten bewertet",
    viewAll: "Alle anzeigen",
    serviceRequest: "Serviceanfrage",
    findProvider: "Anbieter finden",
    login: "Anmelden",
    register: "Registrieren",
    logout: "Abmelden",
    settings: "Einstellungen",
    premium: "Premium-Mitgliedschaft",
    notifications: "Benachrichtigungen",
    aiAssistant: "MoveAI Assistent",
    active: "Aktiv",
    pending: "Ausstehend",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    myJobs: "Mes travaux",
    messages: "Messages",
    profile: "Profil",
    search: "Rechercher des services ou prestataires...",
    categories: "Catégories de services",
    topRated: "Les mieux notés",
    viewAll: "Voir tout",
    serviceRequest: "Demande de service",
    findProvider: "Trouver un prestataire",
    login: "Connexion",
    register: "Inscription",
    logout: "Déconnexion",
    settings: "Paramètres",
    premium: "Abonnement Premium",
    notifications: "Notifications",
    aiAssistant: "Assistant MoveAI",
    active: "Actif",
    pending: "En attente",
    completed: "Terminé",
    cancelled: "Annulé",
  },
  ar: {
    home: "الرئيسية",
    explore: "استكشاف",
    myJobs: "أعمالي",
    messages: "الرسائل",
    profile: "الملف الشخصي",
    search: "ابحث عن خدمات أو مقدمي خدمات...",
    categories: "فئات الخدمات",
    topRated: "الأعلى تقييماً",
    viewAll: "عرض الكل",
    serviceRequest: "طلب خدمة",
    findProvider: "ابحث عن مقدم خدمة",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
    settings: "الإعدادات",
    premium: "العضوية المميزة",
    notifications: "الإشعارات",
    aiAssistant: "مساعد MoveAI",
    active: "نشط",
    pending: "قيد الانتظار",
    completed: "مكتمل",
    cancelled: "ملغى",
  },
};

let currentLanguage: Language = "tr";

export function setLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: TranslationKey): string {
  return translations[currentLanguage]?.[key] || translations.tr[key] || key;
}

