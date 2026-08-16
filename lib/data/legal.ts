// Move&Fix Legal & Compliance Module v1.0
// Tüm hukuki metinler ve sözleşmeler

export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  version: string;
  lastUpdated: string;
}

export type LegalDocumentLocale = "tr" | "en";
export type LegalReviewStatus = "approved" | "pending_legal_review";

export interface LocalizedLegalDocument extends LegalDocument {
  locale: LegalDocumentLocale;
  reviewStatus: LegalReviewStatus;
  authoritative: boolean;
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "terms",
    title: "Kullanım Koşulları",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX KULLANIM KOŞULLARI

1. PLATFORM TANIMI

Move&Fix, dijital aracılık platformudur. Platform;
• Kullanıcılar arasında iletişim kurulmasını,
• Teklif verilmesini,
• Ödeme altyapısının kullanılmasını,
• Mesajlaşmayı,
• Değerlendirme sistemini sağlar.

Platform hiçbir kullanıcının;
• Çalışanı,
• İşvereni,
• Temsilcisi,
• Vekili,
• Ortağı değildir.

2. HİZMET KAPSAMI

Move&Fix yalnızca müşteri ile hizmet sağlayıcıları dijital ortamda buluşturan teknolojik aracılık hizmeti sunmaktadır.

3. KULLANICI YÜKÜMLÜLÜKLERİ

Kullanıcılar platformu kullanırken;
• Doğru ve güncel bilgi vermekle,
• Hesap güvenliğini sağlamakla,
• Yürürlükteki yasalara uymakla,
• Platform kurallarına uymakla yükümlüdür.

4. HESAP ASKIYA ALMA

Platform, kuralları ihlal eden hesapları önceden bildirimde bulunarak veya acil durumlarda derhal askıya alabilir veya kapatabilir.

5. DEĞİŞİKLİKLER

Move&Fix bu koşulları önceden bildirim yaparak değiştirme hakkını saklı tutar. Değişiklikler yayınlandığı tarihte yürürlüğe girer.`,
  },
  {
    id: "privacy",
    title: "Gizlilik Politikası",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX GİZLİLİK POLİTİKASI

1. VERİ TOPLAMA

Kullanıcı verileri aşağıdaki amaçlarla işlenebilir:
• Hesap oluşturma ve yönetimi
• Güvenlik ve doğrulama
• Hizmet sunumu ve iyileştirme
• Yasal yükümlülüklerin yerine getirilmesi
• Dolandırıcılığı önleme

2. VERİ KORUMA

Veriler ilgili mevzuata uygun şekilde korunmaktadır. Şifreleme, erişim kontrolü ve düzenli güvenlik denetimleri uygulanmaktadır.

3. VERİ PAYLAŞIMI

Kullanıcı verileri, yalnızca hizmet sunumu için gerekli olduğu durumlarda ve kullanıcının onayı dahilinde üçüncü taraflarla paylaşılabilir.

4. VERİ SAKLAMA SÜRESİ

Veriler, hizmet sunumu için gerekli olan süre boyunca ve yasal yükümlülükler kapsamında saklanır.

5. KULLANICI HAKLARI

Kullanıcılar verilerine erişim, düzeltme, silme ve taşınabilirlik haklarına sahiptir.`,
  },
  {
    id: "kvkk",
    title: "KVKK Aydınlatma Metni",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX KVKK AYDINLATMA METNİ

6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Aydınlatma Metni

1. VERİ SORUMLUSU

Move&Fix platformu olarak kişisel verilerinizin korunmasına büyük önem veriyoruz.

2. İŞLENEN KİŞİSEL VERİLER

• Kimlik bilgileri (ad, soyad)
• İletişim bilgileri (telefon, e-posta, adres)
• Konum bilgileri
• Ödeme bilgileri
• Cihaz ve oturum bilgileri
• Hizmet geçmişi ve değerlendirmeler

3. İŞLEME AMAÇLARI

• Hizmet sunumu ve platform işleyişi
• Kullanıcı kimlik doğrulama
• Ödeme işlemlerinin gerçekleştirilmesi
• Müşteri desteği sağlanması
• Yasal yükümlülüklerin yerine getirilmesi
• Platform güvenliğinin sağlanması

4. VERİ SAKLAMA SÜRESİ

Kişisel veriler, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatın öngördüğü zamanaşımı süreleri dahilinde saklanır.

5. HAKLARINIZ

KVKK'nın 11. maddesi kapsamında;
• Kişisel verilerinizin işlenip işlenmediğini öğrenme,
• İşlenmişse buna ilişkin bilgi talep etme,
• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,
• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,
• Eksik veya yanlış işlenmişse düzeltilmesini isteme,
• Silinmesini veya yok edilmesini isteme,
• Düzeltme/silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,
• İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,
• Kanuna aykırı işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.`,
  },
  {
    id: "cookies",
    title: "Çerez Politikası",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX ÇEREZ POLİTİKASI

1. ÇEREZ NEDİR?

Çerezler, web sitemizi ziyaret ettiğinizde cihazınıza yerleştirilen küçük metin dosyalarıdır.

2. KULLANILAN ÇEREZ TÜRLERİ

• Zorunlu Çerezler: Platform işleyişi için gerekli, devre dışı bırakılamaz.
• Performans Çerezleri: Platformun performansını ölçmek için kullanılır.
• Analitik Çerezler: Kullanıcı davranışlarını analiz etmek için kullanılır.
• Tercih Çerezleri: Kullanıcı tercihlerini hatırlamak için kullanılır.

3. ÇEREZ YÖNETİMİ

Tarayıcı ayarlarınızdan çerezleri yönetebilir, silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezlerin engellenmesi platform işleyişini olumsuz etkileyebilir.`,
  },
  {
    id: "provider_agreement",
    title: "Hizmet Sağlayıcı Sözleşmesi",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX HİZMET SAĞLAYICI SÖZLEŞMESİ

1. TARAFLAR

Bu sözleşme, Move&Fix platformu ile hizmet sağlayıcı arasında akdedilmiştir.

2. HİZMET SAĞLAYICININ SORUMLULUKLARI

Hizmet sağlayıcı;
• Kendi sunduğu hizmetten,
• Kendi fiyatlandırmasından,
• Kendi çalışma şeklinden,
• Kendi vergi yükümlülüklerinden,
• Kendi mesleki sorumluluklarından kendisi sorumludur.

3. İLİŞKİ NİTELİĞİ

Move&Fix, hizmet sağlayıcının işvereni değildir. Taraflar arasında herhangi bir iş ilişkisi, ortaklık veya temsil ilişkisi bulunmamaktadır.

4. KOMİSYON

Move&Fix, platform üzerinden gerçekleştirilen işlemlerden belirlenen oranda komisyon alır. Komisyon oranları platform tarafından önceden bildirilir.

5. HESAP ASKIYA ALMA

Platform kurallarını ihlal eden, müşteri şikayetleri alan veya sahte bilgi veren hizmet sağlayıcıların hesapları askıya alınabilir.`,
  },
  {
    id: "customer_agreement",
    title: "Müşteri Sözleşmesi",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX MÜŞTERİ SÖZLEŞMESİ

1. TARAFLAR

Bu sözleşme, Move&Fix platformu ile müşteri arasında akdedilmiştir.

2. MÜŞTERİNİN SORUMLULUKLARI

Müşteri;
• Hizmet sağlayıcısını kendi değerlendirmesiyle seçer.
• Doğru ve eksiksiz bilgi vermekle yükümlüdür.
• Ödeme yükümlülüklerini zamanında yerine getirir.

3. PLATFORM GARANTİSİ

Move&Fix, hizmet sağlayıcının yaptığı işin sonucuna ilişkin garanti vermez. Platform yalnızca tarafları buluşturan aracılık hizmeti sunmaktadır.

4. DEĞERLENDİRME

Müşteri, aldığı hizmeti platform üzerinden değerlendirebilir. Değerlendirmeler dürüst ve gerçeğe uygun olmalıdır.`,
  },
  {
    id: "corporate_agreement",
    title: "Kurumsal Firma Sözleşmesi",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX KURUMSAL FİRMA SÖZLEŞMESİ

1. TARAFLAR

Bu sözleşme, Move&Fix platformu ile kurumsal firma arasında akdedilmiştir.

2. FİRMA SORUMLULUKLARI

Firmalar;
• Kendi personellerinin,
• Alt yüklenicilerinin,
• İş güvenliğinin,
• Çalışanlarının sorumluluğunu taşırlar.

3. İŞ GÜVENLİĞİ

Firma, iş sağlığı ve güvenliği mevzuatına uygun hareket etmekle yükümlüdür.

4. VERGİ VE YASAL YÜKÜMLÜLÜKLER

Firma, tüm vergi ve yasal yükümlülüklerini kendi başına yerine getirir.`,
  },
  {
    id: "payment_policy",
    title: "Ödeme ve İade Politikası",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX ÖDEME VE İADE POLİTİKASI

1. ÖDEME SİSTEMİ

Ödemeler, uygulanan ödeme modeline göre güvenli şekilde işlenir. Platform, emanet (escrow) ödeme sistemi kullanmaktadır.

2. EMANET SİSTEMİ

• Müşteri ödemeyi yapar, tutar emanette bekletilir.
• Hizmet tamamlandığında ve müşteri onayladığında ödeme sağlayıcıya aktarılır.
• Anlaşmazlık durumunda arabuluculuk süreci başlatılır.

3. İADE KOŞULLARI

• Hizmet başlamadan iptal: Tam iade
• Hizmet başladıktan sonra iptal: Tamamlanan kısım düşülerek iade
• Hizmet tamamlandıktan sonra: Uyuşmazlık süreci başlatılır

4. UYUŞMAZLIK ÇÖZÜMÜ

Move&Fix, taraflar arasındaki uyuşmazlıklarda arabuluculuk rolü üstlenir. Çözülemeyen uyuşmazlıklarda yasal yollar saklıdır.

5. KOMİSYON

Platform komisyonu, hizmet tutarı üzerinden hesaplanır ve ödeme sırasında otomatik olarak kesilir.`,
  },
  {
    id: "prohibited",
    title: "Yasaklı Faaliyetler",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX YASAKLI FAALİYETLER

Platform aşağıdaki amaçlarla kullanılamaz:

• Dolandırıcılık
• Sahte hesap oluşturma
• Kimlik sahteciliği
• Spam gönderimi
• Yasa dışı işler
• Şiddet içerikli paylaşımlar
• Nefret söylemi
• Fikri mülkiyet ihlali
• Yetkisiz veri paylaşımı
• Platform dışı ödeme yönlendirmesi
• Sahte değerlendirme
• Rakip platformlara yönlendirme

Bu kuralları ihlal eden hesaplar askıya alınabilir veya kalıcı olarak kapatılabilir. Gerekli durumlarda yasal işlem başlatılabilir.`,
  },
  {
    id: "liability",
    title: "Sorumluluk Sınırlandırması",
    version: "1.0",
    lastUpdated: "2026-08-01",
    content: `MOVE&FIX SORUMLULUK SINIRLANDIRMASI

Move&Fix, hukukun izin verdiği ölçüde, yalnızca dijital platform hizmeti sunmaktadır.

Platform;
• Hizmeti bizzat gerçekleştirmez.
• Taraflar adına taahhütte bulunmaz.
• Taraflar arasındaki sözleşmenin tarafı değildir.
• Kullanıcıların hukuka aykırı davranışlarından sorumlu değildir.
• Yalnızca kendi sunduğu dijital platform hizmetlerinden sorumludur.

Not: Bu madde, yürürlükteki zorunlu hukuk kurallarını ortadan kaldırmaz. Tüketicinin korunması hakkındaki mevzuat hükümleri saklıdır.`,
  },
];

/**
 * Public policy variants are versioned independently from the registration
 * consent record. The canonical Turkish version is approved; the English
 * translation is intentionally labelled for legal review instead of being
 * presented as an approved legal instrument.
 */
export const PRIVACY_POLICY_TRANSLATIONS: Record<LegalDocumentLocale, LocalizedLegalDocument> = {
  tr: {
    id: "privacy",
    locale: "tr",
    title: "Gizlilik Politikası",
    version: "1.0",
    lastUpdated: "2026-08-01",
    reviewStatus: "approved",
    authoritative: true,
    content: `MOVE&FIX GİZLİLİK POLİTİKASI

1. VERİ TOPLAMA

Kullanıcı verileri aşağıdaki amaçlarla işlenebilir:
• Hesap oluşturma ve yönetimi
• Güvenlik ve doğrulama
• Hizmet sunumu ve iyileştirme
• Yasal yükümlülüklerin yerine getirilmesi
• Dolandırıcılığı önleme

2. VERİ KORUMA

Veriler ilgili mevzuata uygun şekilde korunmaktadır. Şifreleme, erişim kontrolü ve düzenli güvenlik denetimleri uygulanmaktadır.

3. VERİ PAYLAŞIMI

Kullanıcı verileri, yalnızca hizmet sunumu için gerekli olduğu durumlarda ve kullanıcının onayı dahilinde üçüncü taraflarla paylaşılabilir.

4. VERİ SAKLAMA SÜRESİ

Veriler, hizmet sunumu için gerekli olan süre boyunca ve yasal yükümlülükler kapsamında saklanır.

5. KULLANICI HAKLARI

Kullanıcılar verilerine erişim, düzeltme, silme ve taşınabilirlik haklarına sahiptir.`,
  },
  en: {
    id: "privacy",
    locale: "en",
    title: "Privacy Policy",
    version: "1.0",
    lastUpdated: "2026-08-01",
    reviewStatus: "pending_legal_review",
    authoritative: false,
    content: `MOVE&FIX PRIVACY POLICY

1. DATA COLLECTION

User data may be processed for the following purposes:
• Creating and managing accounts
• Security and verification
• Providing and improving services
• Meeting legal obligations
• Preventing fraud

2. DATA PROTECTION

Data is protected in accordance with applicable legislation. Encryption, access controls, and regular security reviews are applied.

3. DATA SHARING

User data may be shared with third parties only where necessary to provide the service and subject to the user's consent where required.

4. DATA RETENTION

Data is retained for as long as necessary to provide the service and to meet legal obligations.

5. USER RIGHTS

Users may have rights to access, correct, erase, and obtain portability of their data.`,
  },
};

// Registration consent items
export const REGISTRATION_CONSENTS = [
  { id: "terms", label: "Kullanım Koşullarını okudum ve kabul ediyorum.", required: true, documentId: "terms" },
  { id: "privacy", label: "Gizlilik Politikasını okudum.", required: true, documentId: "privacy" },
  { id: "kvkk", label: "KVKK Aydınlatma Metnini okudum.", required: true, documentId: "kvkk" },
  { id: "cookies", label: "Çerez Politikasını okudum.", required: true, documentId: "cookies" },
  { id: "mediation", label: "Move&Fix'in yalnızca müşteri ile hizmet sağlayıcıları buluşturan dijital aracılık platformu olduğunu anladım.", required: true, documentId: null },
  { id: "electronic", label: "Elektronik sözleşmeyi kabul ediyorum.", required: true, documentId: null },
];

/**
 * The server derives the current consent version from this catalog. Clients may
 * request outstanding consent keys, but they never supply a trusted version.
 */
export function getRequiredRegistrationConsentDocuments() {
  return REGISTRATION_CONSENTS
    .filter((consent) => consent.required)
    .map((consent) => ({
      consentKey: consent.id,
      documentVersion: consent.documentId
        ? LEGAL_DOCUMENTS.find((document) => document.id === consent.documentId)?.version ?? "1.0"
        : "1.0",
      purpose: "legal" as const,
    }));
}

// Mediation declaration content
export const MEDIATION_DECLARATION = {
  title: "Move&Fix Aracılık Beyanı",
  content: `Move&Fix;

• Hizmeti sunan taraf değildir.
• Hizmeti gerçekleştiren kişi değildir.
• Hizmetin işvereni değildir.
• Hizmet sözleşmesinin tarafı değildir.
• Taraflar adına garanti veren kuruluş değildir.

Platform yalnızca müşteri ile hizmet sağlayıcıları dijital ortamda buluşturan teknolojik aracılık hizmeti sunmaktadır.

Hizmetin;
• Kalitesi,
• Uygulanması,
• Süresi,
• Fiyatı,
• Sonucu,
• Mesleki yeterliliği

ilgili hizmet sağlayıcının sorumluluğundadır.

Move&Fix yalnızca platform hizmeti sunmaktadır.`,
  checkboxes: ["Okudum", "Anladım", "Kabul Ediyorum"],
};

// First use information
export const FIRST_USE_INFO = {
  title: "Move&Fix'e Hoş Geldiniz",
  message: "Move&Fix, müşteri ile hizmet sağlayıcıları dijital ortamda buluşturan bir platformdur. Hizmeti sunan taraf hizmet sağlayıcıdır. Lütfen hizmet almadan önce profil, puan ve yorumları inceleyiniz.",
};
