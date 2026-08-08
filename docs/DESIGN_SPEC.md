# Move&Fix Design Specification — Final

## Color System (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| Background | #111315 | Ana arka plan |
| Surface | #1C1F22 | Kart arka planı |
| Card | #24272A | İç kart / border |
| Secondary | #303338 | Hover / secilmiş |
| Text White | #E5E7EB | Ana metin |
| Text Gray | #9CA3AF | İkincil metin |
| Primary Orange | #FF6A00 | CTA, secili tab, vurgu |
| Accent Purple | #8A5CFF | MoveAI kimliği |
| Success Green | #22C55E | Başarı, müsait |
| Error Red | #EF4444 | Hata, iptal |
| Warning Amber | #F59E0B | Uyarı |

## Navigation (6 tabs)
1. Ana Sayfa
2. Keşfet
3. İşlerim
4. Mesajlar
5. MoveWallet
6. Profil

## Ana Sayfa Sections
- Kişiselleştirilmiş karşılama ("Merhaba [Ad] 👋")
- Arama çubuğu ("Ne ihtiyacın var?")
- MoveAI banner (mor, belirgin — "MoveAI ile anlat")
- Hızlı erişim: Acil Yardım, Araç, Ev, Taşıma
- Aktif iş kartı (varsa — mini harita + durum)
- Yakındaki ustalar (yatay scroll)
- Popüler hizmetler
- Kampanyalar

## MoveAI
- Mor/lila kimlik (#8A5CFF)
- Doğal dilde ihtiyaç anlama
- Soru sorar, netleştirir, talep oluşturur
- "Evimin suyu akıyor" → Su Tesisatı, acil, konum ister
- Action butonları: "Talebi Gör", "Profesyonelleri Gör"

## Keşfet
- Arama + kategori filtre chips (Tümü, Acil, Ev, Araç, Taşıma, Teknik, Temizlik)
- Sade kategori listesi (icon + typography, devasa pastel kart DEĞİL)
- Kategori → Alt kategori → Hizmet → Profesyoneller

## Hizmet Talebi
- Step indicator: Hizmet → Detay → Zaman → Konum → Onay
- Alanlar: kategori, açıklama, fotoğraf/video, konum, tarih/saat, bütçe, acil/normal
- MoveAI yardımı entegre

## Profesyonel Kart
- Fotoğraf, isim, doğrulanmış badge
- Puan, yorum sayısı, mesafe
- Uzmanlık, müsaitlik, ETA
- "Profili Gör" butonu

## Ödeme
- Sade, güven veren
- Hizmet özeti, profesyonel, tutar
- Ödeme yöntemi seçimi
- "Güvenli Ödeme Yap"

## Canlı Takip
- Harita + profesyonel konumu
- ETA, isim, telefon, mesaj
- Durum timeline

## İşlerim
- Tabs: Aktif, Teklifler, Planlanan, Tamamlanan
- Her iş: durum, usta, ödeme, mesaj, takip

## MoveWallet
- Bakiye kartı
- Para Ekle, Gönder, İşlem Geçmişi
- Son işlemler (yeşil/kırmızı)

## Profil
- Avatar, isim, puan
- Menü: Kişisel bilgiler, Adresler, Ödeme yöntemleri, MoveWallet, Favoriler, Geçmiş işler, Değerlendirmeler, Bildirimler, Güvenlik, Ayarlar

## Profesyonel Dashboard
- Bugünkü kazanç, aktif iş, yeni teklif
- Müsaitlik toggle
- Yeni işler, aktif işler, takvim, kazançlar, mesajlar, profil

## Design Principles
- Premium, modern, sade, teknolojik
- Apple sadeliği + Uber akışı + Airbnb güveni
- Emoji yerine modern ikonografi
- Hardcoded demo verileri YOK
- Loading/empty/error/success state'ler ZORUNLU
- Mobil-first, responsive, safe area
