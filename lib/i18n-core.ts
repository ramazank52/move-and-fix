export type Language = "tr" | "en" | "de" | "fr" | "ar" | "ru";
export type SupportedCurrency = "TRY";

export const LANGUAGES: { code: Language; name: string; nativeName: string; locale: string; isRTL: boolean }[] = [
  { code: "tr", name: "Turkish", nativeName: "Türkçe", locale: "tr-TR", isRTL: false },
  { code: "en", name: "English", nativeName: "English", locale: "en-US", isRTL: false },
  { code: "de", name: "German", nativeName: "Deutsch", locale: "de-DE", isRTL: false },
  { code: "fr", name: "French", nativeName: "Français", locale: "fr-FR", isRTL: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", locale: "ar", isRTL: true },
  { code: "ru", name: "Russian", nativeName: "Русский", locale: "ru-RU", isRTL: false },
];

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string; locale: string }[] = [
  { code: "TRY", label: "Türk lirası (TRY)", locale: "tr-TR" },
];

export type TranslationKey =
  | "home" | "explore" | "myJobs" | "messages" | "profile" | "search" | "categories" | "topRated" | "viewAll"
  | "serviceRequest" | "findProvider" | "login" | "register" | "logout" | "settings" | "premium" | "notifications"
  | "aiAssistant" | "active" | "pending" | "completed" | "cancelled" | "language" | "currency" | "wallet" | "restartRequired"
  | "settingsSecurity" | "darkMode" | "activeDevices" | "about" | "privacyPolicy" | "terms" | "logoutConfirmTitle"
  | "logoutConfirmBody" | "cancel" | "currencyTry" | "version" | "languageSelectionHelp" | "back" | "security"
  | "home.greeting" | "home.defaultName" | "home.subtitle" | "home.searchPlaceholder" | "home.moveAITitle"
  | "home.moveAISubtitle" | "home.quickAccess" | "home.activeJob" | "home.nearbyProviders" | "home.popularServices"
  | "home.noNearbyProviders" | "home.quickAccess_emergency" | "home.quickAccess_vehicle" | "home.quickAccess_home"
  | "home.quickAccess_moving" | "home.service.cleaning" | "home.service.plumbing" | "home.service.electricity"
  | "home.service.airConditioning" | "home.serviceCount" | "common.seeAll"
  | "explore.title" | "explore.all" | "explore.emergency" | "explore.vehicle" | "explore.loadingServices"
  | "explore.categoriesFailed" | "explore.retry" | "explore.noServices" | "explore.recommendedProviders"
  | "explore.loadingProvidersFailed" | "explore.noProviders" | "explore.providerCount" | "explore.moveScore"
  | "ai.welcome" | "ai.online" | "ai.thinking" | "ai.inputPlaceholder" | "ai.fallback"
  | "ai.requestCreatedTitle" | "ai.requestCreatedBody" | "ai.later" | "ai.viewProviders"
  | "ai.prompt.plumbing" | "ai.prompt.roadside" | "ai.prompt.airConditioning" | "ai.prompt.towTruck"
  | "ai.prompt.courier" | "ai.prompt.priceEstimate"
  | "wallet.loading" | "wallet.loadFailedTitle" | "wallet.loadFailedBody" | "wallet.retry" | "wallet.retryAccessibility"
  | "wallet.historyAccessibility" | "wallet.balance" | "wallet.pendingEscrow" | "wallet.addMoney" | "wallet.withdraw"
  | "wallet.history" | "wallet.recentTransactions" | "wallet.allTransactionsAccessibility" | "wallet.emptyTitle" | "wallet.emptyBody"
  | "profile.defaultName" | "profile.defaultMember" | "profile.reviewCount" | "profile.personalInfo" | "profile.addresses"
  | "profile.paymentMethods" | "profile.favorites" | "profile.pastJobs" | "profile.settingsSecurity"
  | "checkout.invalidLink" | "checkout.invalidLinkBody" | "checkout.loadingQuote" | "checkout.quoteUnavailable"
  | "checkout.serviceSummary" | "checkout.provider" | "checkout.total" | "checkout.escrowGuarantee" | "checkout.feeBreakdown"
  | "checkout.serviceFee" | "checkout.platformCommission" | "checkout.commissionInfo" | "checkout.totalPayable" | "checkout.paymentMethod"
  | "checkout.walletVerifying" | "checkout.walletUnavailable" | "checkout.walletAvailable" | "checkout.walletBlocked"
  | "checkout.iyzicoSubtitle" | "checkout.stripeReady" | "checkout.stripeBlocked" | "checkout.billingInfo" | "checkout.billingInfoBody"
  | "checkout.phonePlaceholder" | "checkout.identityPlaceholder" | "checkout.addressPlaceholder" | "checkout.cityPlaceholder" | "checkout.zipPlaceholder"
  | "checkout.securityNotice" | "checkout.title" | "checkout.processing" | "checkout.payWith"
  | "provider.dashboardLoading" | "provider.dashboardUnavailable" | "provider.dashboardUnavailableBody" | "provider.today"
  | "provider.todayEarnings" | "provider.totalEarnings" | "provider.activeJobs" | "provider.newOffers" | "provider.availability"
  | "provider.available" | "provider.unavailable" | "provider.menuNewJobs" | "provider.menuActiveJobs" | "provider.menuCalendar"
  | "provider.menuEarnings" | "provider.menuMessages" | "provider.menuProfile";

type Dictionary = Partial<Record<TranslationKey, string>>;
export type TranslationValues = Record<string, string | number>;

const translations: Record<Language, Dictionary> = {
  tr: {
    home: "Ana Sayfa", explore: "Keşfet", myJobs: "İşlerim", messages: "Mesajlar", profile: "Profil", search: "Hizmet veya usta ara...", categories: "Hizmet Kategorileri", topRated: "En Yüksek Puanlı", viewAll: "Tümü", serviceRequest: "Hizmet Talebi", findProvider: "Usta Bul", login: "Giriş Yap", register: "Kayıt Ol", logout: "Çıkış Yap", settings: "Ayarlar", premium: "Premium Üyelik", notifications: "Bildirimler", aiAssistant: "MoveAI Asistan", active: "Aktif", pending: "Bekleyen", completed: "Tamamlanan", cancelled: "İptal", language: "Dil", currency: "Para Birimi", wallet: "MoveWallet", restartRequired: "Yön değişikliğinin uygulanması için uygulamayı yeniden açın.", settingsSecurity: "Ayarlar ve Güvenlik", darkMode: "Karanlık Mod", activeDevices: "Aktif Cihazlar", about: "Hakkında", privacyPolicy: "Gizlilik Politikası", terms: "Kullanım Koşulları", logoutConfirmTitle: "Çıkış Yap", logoutConfirmBody: "Hesabınızdan çıkış yapmak istediğinize emin misiniz?", cancel: "İptal", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Uygulama dilini seçin. Arapça yön değişikliğinin tamamlanması için uygulamayı yeniden açmanız gerekir.", back: "Geri dön", security: "Güvenlik", "home.greeting": "Merhaba {name} 👋", "home.defaultName": "Kullanıcı", "home.subtitle": "Bugün sana nasıl yardımcı olabilirim?", "home.searchPlaceholder": "Ne arıyorsun?", "home.moveAITitle": "MoveAI ile anlat", "home.moveAISubtitle": "Doğal dille söyle, biz halledelim", "home.quickAccess": "Hızlı Erişim", "home.activeJob": "Aktif İş", "home.nearbyProviders": "Yakındaki Ustalar", "home.popularServices": "Popüler Hizmetler", "home.noNearbyProviders": "Yakında profesyonel bulunamadı", "home.quickAccess_emergency": "Acil Yardım", "home.quickAccess_vehicle": "Araç", "home.quickAccess_home": "Ev", "home.quickAccess_moving": "Taşıma", "home.service.cleaning": "Temizlik", "home.service.plumbing": "Su Tesisatı", "home.service.electricity": "Elektrik", "home.service.airConditioning": "Klima", "home.serviceCount": "{count} hizmet", "common.seeAll": "Tümü", "explore.title": "Ne arıyorsun?", "explore.all": "Tümü", "explore.emergency": "Acil", "explore.vehicle": "Araç", "explore.loadingServices": "Hizmetler yükleniyor...", "explore.categoriesFailed": "Kategoriler yüklenemedi", "explore.retry": "Yeniden dene", "explore.noServices": "Aramana uygun hizmet bulunamadı.", "explore.recommendedProviders": "Önerilen Ustalar", "explore.loadingProvidersFailed": "Profesyoneller yüklenemedi. Yeniden dene.", "explore.noProviders": "Uygun profesyonel bulunamadı.", "explore.providerCount": "{count} profesyonel", "explore.moveScore": "MoveScore {score}"
  },
  en: {
    home: "Home", explore: "Explore", myJobs: "My Jobs", messages: "Messages", profile: "Profile", search: "Search for services or providers...", categories: "Service Categories", topRated: "Top Rated", viewAll: "View All", serviceRequest: "Service Request", findProvider: "Find Provider", login: "Login", register: "Register", logout: "Log out", settings: "Settings", premium: "Premium Membership", notifications: "Notifications", aiAssistant: "MoveAI Assistant", active: "Active", pending: "Pending", completed: "Completed", cancelled: "Cancelled", language: "Language", currency: "Currency", wallet: "MoveWallet", restartRequired: "Reopen the app to apply the direction change.", settingsSecurity: "Settings & Security", darkMode: "Dark Mode", activeDevices: "Active Devices", about: "About", privacyPolicy: "Privacy Policy", terms: "Terms of Use", logoutConfirmTitle: "Log out", logoutConfirmBody: "Are you sure you want to sign out of your account?", cancel: "Cancel", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Choose the app language. Reopen the app to fully apply Arabic right-to-left direction.", back: "Go back", security: "Security", "home.greeting": "Hello {name} 👋", "home.defaultName": "Customer", "home.subtitle": "How can I help you today?", "home.searchPlaceholder": "What are you looking for?", "home.moveAITitle": "Tell MoveAI", "home.moveAISubtitle": "Say it naturally, we’ll handle it", "home.quickAccess": "Quick Access", "home.activeJob": "Active Job", "home.nearbyProviders": "Nearby Providers", "home.popularServices": "Popular Services", "home.noNearbyProviders": "No nearby providers found", "home.quickAccess_emergency": "Emergency", "home.quickAccess_vehicle": "Vehicle", "home.quickAccess_home": "Home", "home.quickAccess_moving": "Moving", "home.service.cleaning": "Cleaning", "home.service.plumbing": "Plumbing", "home.service.electricity": "Electrical", "home.service.airConditioning": "Air Conditioning", "home.serviceCount": "{count} services", "common.seeAll": "See All", "explore.title": "What are you looking for?", "explore.all": "All", "explore.emergency": "Emergency", "explore.vehicle": "Vehicle", "explore.loadingServices": "Loading services...", "explore.categoriesFailed": "Categories could not be loaded", "explore.retry": "Try again", "explore.noServices": "No services match your search.", "explore.recommendedProviders": "Recommended Providers", "explore.loadingProvidersFailed": "Providers could not be loaded. Try again.", "explore.noProviders": "No suitable providers found.", "explore.providerCount": "{count} providers", "explore.moveScore": "MoveScore {score}"
  },
  de: {
    home: "Startseite", explore: "Entdecken", myJobs: "Meine Aufträge", messages: "Nachrichten", profile: "Profil", search: "Dienste oder Anbieter suchen...", categories: "Dienstkategorien", topRated: "Am besten bewertet", viewAll: "Alle anzeigen", serviceRequest: "Serviceanfrage", findProvider: "Anbieter finden", login: "Anmelden", register: "Registrieren", logout: "Abmelden", settings: "Einstellungen", premium: "Premium-Mitgliedschaft", notifications: "Benachrichtigungen", aiAssistant: "MoveAI Assistent", active: "Aktiv", pending: "Ausstehend", completed: "Abgeschlossen", cancelled: "Storniert", language: "Sprache", currency: "Währung", wallet: "MoveWallet", restartRequired: "Öffnen Sie die App erneut, um die Richtungsänderung anzuwenden.", settingsSecurity: "Einstellungen & Sicherheit", darkMode: "Dunkler Modus", activeDevices: "Aktive Geräte", about: "Über", privacyPolicy: "Datenschutz", terms: "Nutzungsbedingungen", logoutConfirmTitle: "Abmelden", logoutConfirmBody: "Möchten Sie sich wirklich abmelden?", cancel: "Abbrechen", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Wählen Sie die App-Sprache. Öffnen Sie die App erneut, um die arabische Schreibrichtung vollständig anzuwenden.", back: "Zurück", security: "Sicherheit"
  },
  fr: {
    home: "Accueil", explore: "Explorer", myJobs: "Mes travaux", messages: "Messages", profile: "Profil", search: "Rechercher des services ou prestataires...", categories: "Catégories de services", topRated: "Les mieux notés", viewAll: "Voir tout", serviceRequest: "Demande de service", findProvider: "Trouver un prestataire", login: "Connexion", register: "Inscription", logout: "Déconnexion", settings: "Paramètres", premium: "Abonnement Premium", notifications: "Notifications", aiAssistant: "Assistant MoveAI", active: "Actif", pending: "En attente", completed: "Terminé", cancelled: "Annulé", language: "Langue", currency: "Devise", wallet: "MoveWallet", restartRequired: "Rouvrez l’application pour appliquer le changement de direction.", settingsSecurity: "Paramètres et sécurité", darkMode: "Mode sombre", activeDevices: "Appareils actifs", about: "À propos", privacyPolicy: "Politique de confidentialité", terms: "Conditions d’utilisation", logoutConfirmTitle: "Déconnexion", logoutConfirmBody: "Voulez-vous vraiment vous déconnecter ?", cancel: "Annuler", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Choisissez la langue de l’application. Rouvrez l’application pour appliquer complètement la direction arabe de droite à gauche.", back: "Retour", security: "Sécurité"
  },
  ar: {
    home: "الرئيسية", explore: "استكشاف", myJobs: "أعمالي", messages: "الرسائل", profile: "الملف الشخصي", search: "ابحث عن خدمات أو مقدمي خدمات...", categories: "فئات الخدمات", topRated: "الأعلى تقييماً", viewAll: "عرض الكل", serviceRequest: "طلب خدمة", findProvider: "ابحث عن مقدم خدمة", login: "تسجيل الدخول", register: "إنشاء حساب", logout: "تسجيل الخروج", settings: "الإعدادات", premium: "العضوية المميزة", notifications: "الإشعارات", aiAssistant: "مساعد MoveAI", active: "نشط", pending: "قيد الانتظار", completed: "مكتمل", cancelled: "ملغى", language: "اللغة", currency: "العملة", wallet: "محفظة موف", restartRequired: "أعد فتح التطبيق لتطبيق تغيير الاتجاه.", settingsSecurity: "الإعدادات والأمان", darkMode: "الوضع الداكن", activeDevices: "الأجهزة النشطة", about: "حول", privacyPolicy: "سياسة الخصوصية", terms: "شروط الاستخدام", logoutConfirmTitle: "تسجيل الخروج", logoutConfirmBody: "هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟", cancel: "إلغاء", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "اختر لغة التطبيق. أعد فتح التطبيق لتطبيق اتجاه العربية من اليمين إلى اليسار بالكامل.", back: "رجوع", security: "الأمان"
  },
  ru: {
    home: "Главная", explore: "Каталог", myJobs: "Мои заказы", messages: "Сообщения", profile: "Профиль", search: "Поиск услуг или специалистов...", categories: "Категории услуг", topRated: "С высоким рейтингом", viewAll: "Все", serviceRequest: "Заявка на услугу", findProvider: "Найти специалиста", login: "Войти", register: "Регистрация", logout: "Выйти", settings: "Настройки", premium: "Премиум-подписка", notifications: "Уведомления", aiAssistant: "Ассистент MoveAI", active: "Активно", pending: "Ожидает", completed: "Завершено", cancelled: "Отменено", language: "Язык", currency: "Валюта", wallet: "MoveWallet", restartRequired: "Перезапустите приложение, чтобы применить изменение направления.", settingsSecurity: "Настройки и безопасность", darkMode: "Тёмный режим", activeDevices: "Активные устройства", about: "О приложении", privacyPolicy: "Политика конфиденциальности", terms: "Условия использования", logoutConfirmTitle: "Выйти", logoutConfirmBody: "Вы действительно хотите выйти из аккаунта?", cancel: "Отмена", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Выберите язык приложения. Чтобы полностью применить арабское направление справа налево, перезапустите приложение.", back: "Назад", security: "Безопасность", "home.greeting": "Привет, {name} 👋", "home.defaultName": "Пользователь", "home.subtitle": "Чем могу помочь сегодня?", "home.searchPlaceholder": "Что ищете?", "home.moveAITitle": "Расскажите MoveAI", "home.moveAISubtitle": "Скажите естественно, мы разберёмся", "home.quickAccess": "Быстрый доступ", "home.activeJob": "Активная работа", "home.nearbyProviders": "Ближайшие мастера", "home.popularServices": "Популярные услуги", "home.noNearbyProviders": "Поблизости нет мастеров", "home.quickAccess_emergency": "Экстренная помощь", "home.quickAccess_vehicle": "Транспорт", "home.quickAccess_home": "Дом", "home.quickAccess_moving": "Переезд", "home.service.cleaning": "Уборка", "home.service.plumbing": "Сантехника", "home.service.electricity": "Электрика", "home.service.airConditioning": "Кондиционирование", "home.serviceCount": "Услуг: {count}", "common.seeAll": "Все", "explore.title": "Что ищете?", "explore.all": "Все", "explore.emergency": "Экстренно", "explore.vehicle": "Транспорт", "explore.loadingServices": "Загрузка услуг...", "explore.categoriesFailed": "Не удалось загрузить категории", "explore.retry": "Повторить", "explore.noServices": "Нет услуг по вашему запросу.", "explore.recommendedProviders": "Рекомендуемые мастера", "explore.loadingProvidersFailed": "Не удалось загрузить мастеров. Повторите попытку.", "explore.noProviders": "Подходящие мастера не найдены.", "explore.providerCount": "Мастеров: {count}", "explore.moveScore": "MoveScore {score}"
  },
};

const extraTranslations: Partial<Record<Language, Dictionary>> = {
  tr: {
    "ai.welcome": "Merhaba! Ben MoveAI 🤖 Size nasıl yardımcı olabilirim? Acil bir sorun mu var, hizmet mi arıyorsunuz?",
    "ai.online": "Çevrimiçi", "ai.thinking": "MoveAI düşünüyor...", "ai.inputPlaceholder": "Sorunuzu yazın...",
    "ai.fallback": "Size yardımcı olmaya çalışıyorum. Lütfen biraz daha açıklayıcı olur musunuz?",
    "ai.requestCreatedTitle": "Hizmet Talebi Oluşturuldu", "ai.requestCreatedBody": "MoveAI talebinizi oluşturdu. Şimdi uygun ustaları görüntülemek ister misiniz?",
    "ai.later": "Sonra", "ai.viewProviders": "Ustaları Gör", "ai.prompt.plumbing": "Evimin suyu akıyor",
    "ai.prompt.roadside": "Arabam yolda kaldı", "ai.prompt.airConditioning": "Klima soğutmuyor", "ai.prompt.towTruck": "Çekici lazım",
    "ai.prompt.courier": "Kurye lazım", "ai.prompt.priceEstimate": "Fiyat tahmini",
    "wallet.loading": "MoveWallet yükleniyor…", "wallet.loadFailedTitle": "Cüzdan bilgileri alınamadı", "wallet.loadFailedBody": "Güvenli bağlantınızı kontrol edip yeniden deneyin.",
    "wallet.retry": "Yeniden Dene", "wallet.retryAccessibility": "Cüzdan bilgilerini yeniden yükle", "wallet.historyAccessibility": "MoveWallet işlem geçmişini aç",
    "wallet.balance": "Bakiye", "wallet.pendingEscrow": "Emanette bekleyen {amount}", "wallet.addMoney": "Para Ekle", "wallet.withdraw": "Para Çek",
    "wallet.history": "İşlem Geçmişi", "wallet.recentTransactions": "Son İşlemler", "wallet.allTransactionsAccessibility": "Tüm cüzdan işlemlerini görüntüle",
    "wallet.emptyTitle": "Henüz cüzdan işlemi yok", "wallet.emptyBody": "Ödeme, iade ve para çekme kayıtları burada görüntülenecek.",
    "profile.defaultName": "Move&Fix Kullanıcısı", "profile.defaultMember": "Move&Fix üyesi", "profile.reviewCount": "{count} değerlendirme",
    "profile.personalInfo": "Kişisel Bilgiler", "profile.addresses": "Adreslerim", "profile.paymentMethods": "Ödeme Yöntemleri",
    "profile.favorites": "Favoriler", "profile.pastJobs": "Geçmiş İşler", "profile.settingsSecurity": "Ayarlar & Güvenlik",
    "checkout.invalidLink": "Geçersiz ödeme bağlantısı", "checkout.invalidLinkBody": "İş numarası eksik veya hatalı.", "checkout.loadingQuote": "Güvenli ödeme özeti hazırlanıyor…", "checkout.quoteUnavailable": "Ödeme özeti alınamadı",
    "checkout.serviceSummary": "Hizmet Özeti", "checkout.provider": "Profesyonel: {name}", "checkout.total": "Toplam", "checkout.escrowGuarantee": "Move&Fix Emanet Güvencesi", "checkout.feeBreakdown": "Ücret Dökümü",
    "checkout.serviceFee": "Hizmet bedeli", "checkout.platformCommission": "Platform komisyonu (%{rate})", "checkout.commissionInfo": "Komisyon hizmet bedelinden kesilir; müşteriye ayrıca yansıtılmaz.", "checkout.totalPayable": "Ödenecek Toplam", "checkout.paymentMethod": "Ödeme Yöntemi",
    "checkout.walletVerifying": "Bakiye doğrulanıyor…", "checkout.walletUnavailable": "Bakiye alınamadı · Ödeme BLOCKER", "checkout.walletAvailable": "Kullanılabilir: {amount} · Ödeme BLOCKER", "checkout.walletBlocked": "Ödeme BLOCKER",
    "checkout.iyzicoSubtitle": "Türkiye için güvenli hosted checkout", "checkout.stripeReady": "Uluslararası kart · PaymentSheet", "checkout.stripeBlocked": "Publishable key BLOCKER", "checkout.billingInfo": "Fatura Bilgileri", "checkout.billingInfoBody": "Kart bilgileri Move&Fix’e girilmez. Bu bilgiler iyzico oturumunu açmak için şifreli bağlantıyla sunucuya gönderilir.",
    "checkout.phonePlaceholder": "Cep telefonu (05xx xxx xx xx)", "checkout.identityPlaceholder": "T.C. kimlik numarası", "checkout.addressPlaceholder": "Fatura adresi", "checkout.cityPlaceholder": "Şehir", "checkout.zipPlaceholder": "Posta kodu",
    "checkout.securityNotice": "Tutar ve komisyon yalnızca sunucudaki kabul edilmiş tekliften hesaplanır. Emanet durumu sadece doğrulanmış webhook ile değişir.", "checkout.title": "Güvenli Ödeme", "checkout.processing": "Güvenli oturum hazırlanıyor…", "checkout.payWith": "{provider} ile {amount} Öde",
    "provider.dashboardLoading": "Panel hazırlanıyor...", "provider.dashboardUnavailable": "Panel verileri yüklenemedi", "provider.dashboardUnavailableBody": "Profesyonel profilinizi ve bağlantınızı kontrol edip tekrar deneyin.", "provider.today": "Bugün",
    "provider.todayEarnings": "Bugünkü Kazanç", "provider.totalEarnings": "Toplam kazanç: {amount}", "provider.activeJobs": "Aktif İş", "provider.newOffers": "Yeni Teklif", "provider.availability": "Müsaitlik",
    "provider.available": "Müsait", "provider.unavailable": "Kapalı", "provider.menuNewJobs": "Yeni İşler", "provider.menuActiveJobs": "Aktif İşler", "provider.menuCalendar": "Takvim",
    "provider.menuEarnings": "Kazançlar", "provider.menuMessages": "Mesajlar", "provider.menuProfile": "Profil"
  },
  en: {
    "ai.welcome": "Hello! I’m MoveAI 🤖 How can I help you? Is there an emergency, or are you looking for a service?",
    "ai.online": "Online", "ai.thinking": "MoveAI is thinking...", "ai.inputPlaceholder": "Type your question...",
    "ai.fallback": "I’m trying to help. Could you please give me a little more detail?",
    "ai.requestCreatedTitle": "Service Request Created", "ai.requestCreatedBody": "MoveAI created your request. Would you like to see suitable providers now?",
    "ai.later": "Later", "ai.viewProviders": "View Providers", "ai.prompt.plumbing": "My home has a water leak",
    "ai.prompt.roadside": "My car broke down", "ai.prompt.airConditioning": "My air conditioner is not cooling", "ai.prompt.towTruck": "I need a tow truck",
    "ai.prompt.courier": "I need a courier", "ai.prompt.priceEstimate": "Get a price estimate",
    "wallet.loading": "Loading MoveWallet…", "wallet.loadFailedTitle": "Wallet details could not be loaded", "wallet.loadFailedBody": "Check your secure connection and try again.",
    "wallet.retry": "Try Again", "wallet.retryAccessibility": "Reload wallet details", "wallet.historyAccessibility": "Open MoveWallet transaction history",
    "wallet.balance": "Balance", "wallet.pendingEscrow": "{amount} pending in escrow", "wallet.addMoney": "Add Money", "wallet.withdraw": "Withdraw",
    "wallet.history": "Transaction History", "wallet.recentTransactions": "Recent Transactions", "wallet.allTransactionsAccessibility": "View all wallet transactions",
    "wallet.emptyTitle": "No wallet transactions yet", "wallet.emptyBody": "Payments, refunds, and withdrawal records will appear here.",
    "profile.defaultName": "Move&Fix Customer", "profile.defaultMember": "Move&Fix member", "profile.reviewCount": "{count} reviews",
    "profile.personalInfo": "Personal Information", "profile.addresses": "My Addresses", "profile.paymentMethods": "Payment Methods",
    "profile.favorites": "Favorites", "profile.pastJobs": "Past Jobs", "profile.settingsSecurity": "Settings & Security",
    "checkout.invalidLink": "Invalid payment link", "checkout.invalidLinkBody": "The job number is missing or invalid.", "checkout.loadingQuote": "Preparing your secure payment summary…", "checkout.quoteUnavailable": "Payment summary could not be loaded",
    "checkout.serviceSummary": "Service Summary", "checkout.provider": "Provider: {name}", "checkout.total": "Total", "checkout.escrowGuarantee": "Move&Fix Escrow Protection", "checkout.feeBreakdown": "Price Breakdown",
    "checkout.serviceFee": "Service fee", "checkout.platformCommission": "Platform commission (%{rate})", "checkout.commissionInfo": "The commission is deducted from the service fee and is not charged separately to the customer.", "checkout.totalPayable": "Total to pay", "checkout.paymentMethod": "Payment Method",
    "checkout.walletVerifying": "Verifying balance…", "checkout.walletUnavailable": "Balance unavailable · Payment BLOCKER", "checkout.walletAvailable": "Available: {amount} · Payment BLOCKER", "checkout.walletBlocked": "Payment BLOCKER",
    "checkout.iyzicoSubtitle": "Secure hosted checkout for Türkiye", "checkout.stripeReady": "International card · PaymentSheet", "checkout.stripeBlocked": "Publishable key BLOCKER", "checkout.billingInfo": "Billing Details", "checkout.billingInfoBody": "Card details are never entered into Move&Fix. These details are sent to the server over an encrypted connection to open the iyzico session.",
    "checkout.phonePlaceholder": "Mobile phone (05xx xxx xx xx)", "checkout.identityPlaceholder": "Turkish ID number", "checkout.addressPlaceholder": "Billing address", "checkout.cityPlaceholder": "City", "checkout.zipPlaceholder": "Postal code",
    "checkout.securityNotice": "The amount and commission are calculated only from the accepted server-side offer. Escrow status changes only after a verified webhook.", "checkout.title": "Secure Payment", "checkout.processing": "Preparing secure session…", "checkout.payWith": "Pay {amount} with {provider}",
    "provider.dashboardLoading": "Preparing your dashboard...", "provider.dashboardUnavailable": "Dashboard data could not be loaded", "provider.dashboardUnavailableBody": "Check your provider profile and connection, then try again.", "provider.today": "Today",
    "provider.todayEarnings": "Today’s Earnings", "provider.totalEarnings": "Total earnings: {amount}", "provider.activeJobs": "Active Jobs", "provider.newOffers": "New Offers", "provider.availability": "Availability",
    "provider.available": "Available", "provider.unavailable": "Unavailable", "provider.menuNewJobs": "New Jobs", "provider.menuActiveJobs": "Active Jobs", "provider.menuCalendar": "Calendar",
    "provider.menuEarnings": "Earnings", "provider.menuMessages": "Messages", "provider.menuProfile": "Profile"
  },
  ru: {
    "ai.welcome": "Здравствуйте! Я MoveAI 🤖 Чем могу помочь? У вас срочная проблема или вы ищете услугу?",
    "ai.online": "В сети", "ai.thinking": "MoveAI думает...", "ai.inputPlaceholder": "Напишите ваш вопрос...",
    "ai.fallback": "Я стараюсь помочь. Пожалуйста, опишите ситуацию немного подробнее.",
    "ai.requestCreatedTitle": "Заявка на услугу создана", "ai.requestCreatedBody": "MoveAI создал вашу заявку. Хотите посмотреть подходящих мастеров?",
    "ai.later": "Позже", "ai.viewProviders": "Смотреть мастеров", "ai.prompt.plumbing": "У меня дома течёт вода",
    "ai.prompt.roadside": "Машина сломалась в дороге", "ai.prompt.airConditioning": "Кондиционер не охлаждает", "ai.prompt.towTruck": "Нужен эвакуатор",
    "ai.prompt.courier": "Нужен курьер", "ai.prompt.priceEstimate": "Узнать примерную цену",
    "wallet.loading": "Загрузка MoveWallet…", "wallet.loadFailedTitle": "Не удалось получить данные кошелька", "wallet.loadFailedBody": "Проверьте защищённое подключение и повторите попытку.",
    "wallet.retry": "Повторить", "wallet.retryAccessibility": "Повторно загрузить данные кошелька", "wallet.historyAccessibility": "Открыть историю операций MoveWallet",
    "wallet.balance": "Баланс", "wallet.pendingEscrow": "В эскроу ожидает {amount}", "wallet.addMoney": "Пополнить", "wallet.withdraw": "Вывести",
    "wallet.history": "История операций", "wallet.recentTransactions": "Последние операции", "wallet.allTransactionsAccessibility": "Показать все операции кошелька",
    "wallet.emptyTitle": "Операций в кошельке пока нет", "wallet.emptyBody": "Здесь появятся записи об оплатах, возвратах и выводе средств.",
    "profile.defaultName": "Пользователь Move&Fix", "profile.defaultMember": "Участник Move&Fix", "profile.reviewCount": "Отзывов: {count}",
    "profile.personalInfo": "Личные данные", "profile.addresses": "Мои адреса", "profile.paymentMethods": "Способы оплаты",
    "profile.favorites": "Избранное", "profile.pastJobs": "Прошлые заказы", "profile.settingsSecurity": "Настройки и безопасность",
    "checkout.invalidLink": "Недействительная ссылка на оплату", "checkout.invalidLinkBody": "Номер заказа отсутствует или неверен.", "checkout.loadingQuote": "Готовим защищённую сводку оплаты…", "checkout.quoteUnavailable": "Не удалось получить сводку оплаты",
    "checkout.serviceSummary": "Сводка услуги", "checkout.provider": "Мастер: {name}", "checkout.total": "Итого", "checkout.escrowGuarantee": "Защита эскроу Move&Fix", "checkout.feeBreakdown": "Расчёт стоимости",
    "checkout.serviceFee": "Стоимость услуги", "checkout.platformCommission": "Комиссия платформы (%{rate})", "checkout.commissionInfo": "Комиссия удерживается из стоимости услуги и не взимается с клиента отдельно.", "checkout.totalPayable": "К оплате", "checkout.paymentMethod": "Способ оплаты",
    "checkout.walletVerifying": "Проверяем баланс…", "checkout.walletUnavailable": "Баланс недоступен · BLOCKER оплаты", "checkout.walletAvailable": "Доступно: {amount} · BLOCKER оплаты", "checkout.walletBlocked": "BLOCKER оплаты",
    "checkout.iyzicoSubtitle": "Безопасная платёжная страница для Турции", "checkout.stripeReady": "Международная карта · PaymentSheet", "checkout.stripeBlocked": "BLOCKER publishable key", "checkout.billingInfo": "Платёжные данные", "checkout.billingInfoBody": "Данные карты не вводятся в Move&Fix. Эти данные передаются на сервер по защищённому соединению для открытия сессии iyzico.",
    "checkout.phonePlaceholder": "Мобильный телефон (05xx xxx xx xx)", "checkout.identityPlaceholder": "Турецкий идентификационный номер", "checkout.addressPlaceholder": "Платёжный адрес", "checkout.cityPlaceholder": "Город", "checkout.zipPlaceholder": "Почтовый индекс",
    "checkout.securityNotice": "Сумма и комиссия рассчитываются только по принятому предложению на сервере. Статус эскроу меняется только после подтверждённого webhook.", "checkout.title": "Защищённая оплата", "checkout.processing": "Подготавливаем защищённую сессию…", "checkout.payWith": "Оплатить {amount} через {provider}",
    "provider.dashboardLoading": "Готовим панель...", "provider.dashboardUnavailable": "Не удалось загрузить данные панели", "provider.dashboardUnavailableBody": "Проверьте профиль мастера и подключение, затем повторите попытку.", "provider.today": "Сегодня",
    "provider.todayEarnings": "Заработок за сегодня", "provider.totalEarnings": "Общий заработок: {amount}", "provider.activeJobs": "Активные заказы", "provider.newOffers": "Новые предложения", "provider.availability": "Доступность",
    "provider.available": "Доступен", "provider.unavailable": "Недоступен", "provider.menuNewJobs": "Новые заказы", "provider.menuActiveJobs": "Активные заказы", "provider.menuCalendar": "Календарь",
    "provider.menuEarnings": "Заработок", "provider.menuMessages": "Сообщения", "provider.menuProfile": "Профиль"
  },
};

let currentLanguage: Language = "tr";

export function setLanguage(lang: Language) { currentLanguage = lang; }
export function getLanguage(): Language { return currentLanguage; }
export function t(key: TranslationKey, language?: Language, values?: TranslationValues): string;
export function t(key: TranslationKey, values?: TranslationValues): string;
export function t(key: TranslationKey, languageOrValues: Language | TranslationValues = currentLanguage, maybeValues?: TranslationValues): string {
  const language = typeof languageOrValues === "string" ? languageOrValues : currentLanguage;
  const values = typeof languageOrValues === "string" ? (maybeValues ?? {}) : languageOrValues;
  const template = extraTranslations[language]?.[key] ?? translations[language]?.[key] ?? extraTranslations.tr?.[key] ?? translations.tr[key] ?? key;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
export function localeForLanguage(language: Language) { return LANGUAGES.find((item) => item.code === language)?.locale ?? "tr-TR"; }
export function isRightToLeft(language: Language) { return LANGUAGES.find((item) => item.code === language)?.isRTL ?? false; }
export function formatMoney(amount: number, language: Language = currentLanguage) { return new Intl.NumberFormat(localeForLanguage(language), { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount); }
export function formatLocalDate(value: Date | string | number, language: Language = currentLanguage) { return new Intl.DateTimeFormat(localeForLanguage(language), { dateStyle: "medium" }).format(new Date(value)); }
