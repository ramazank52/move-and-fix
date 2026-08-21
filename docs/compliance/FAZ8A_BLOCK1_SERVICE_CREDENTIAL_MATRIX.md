# Faz 8-A Blok 1 — Servis–Belge Matrisi

**Kapsam:** Nakliye, evden eve taşınma, çekici ve yol yardım capability profilleri.  
**Kaynak paketi:** `TR-GOLD-2026-08-13-v1.0` (as-of: 2026-08-13).  
**Matriks durumu:** `SOURCE_UNVERIFIED` / `LEGAL_REVIEW_REQUIRED`; bu doküman veya içindeki URL’ler üretim hukuk onayı değildir.

> Onaylı kaynak paketi kendi statüsünü `RESEARCH_COMPLETE_DRAFT__PRODUCTION_LEGAL_SIGNOFF_REQUIRED` olarak tanımlar. Bu nedenle aşağıdaki hiçbir satır, yetkin Türkiye hukuk/uyum sorumlusunun kayıtlı `LEGAL_SOURCE_APPROVAL` işlemi olmadan `SOURCE_VERIFIED`, `POLICY_ELIGIBLE` veya aktif capability oluşturmaz.[1]

`capability_key`, Faz 8-A profile sözleşmesinin stable anahtarıdır. Kaynak paketteki hizmet anahtarı ve alt hizmet metni, şartın kaynağını gösterir; çalışma zamanında alias veya serbest metinle hukuki kapsam çıkarımı yapılamaz.

| capability_key | Kaynak kapsamı | required_document / evidence | issuer | verification_method | source_ref | legal_status |
|---|---|---|---|---|---|---|
| `moving.household` | `moving`: Yurtiçi ticari ev ve büro eşyası taşıma | K3 Yetki Belgesi | UAB | Yetki belgesi numarası, işletme sahibi ve güncel durumun resmî UAB kanalı ile eşleşmesi | `UAB_TYPES`, `UAB_VERIFY` [2] [3] | `LEGAL_REVIEW_REQUIRED` |
| `moving.household` | Aynı kapsam | Yetki belgesine kayıtlı taşıt / taşıt belgesi-kartı | UAB | Araç plaka/ruhsat tipi ile yetki belgesindeki taşıt ilişkisinin resmî sorguda eşleşmesi | `UAB_VERIFY` [3] | `SOURCE_UNVERIFIED` |
| `moving.household` | Aynı kapsam | Araç sınıfına uygun sürücü belgesi | Yetkili sürücü belgesi makamı | Belge türü, sürücü sahibi ve araç sınıfı; resmî doğrulama sinyali yoksa blok | Kaynak paketi `moving:1` [1] | `SOURCE_UNVERIFIED` |
| `moving.household` | Aynı kapsam | SRC4, yalnız güncel Karayolu Taşıma kuralının sürücüye uygulandığı durumda | UAB / yetkili belgelendirme kanalı | Belge sahibi, geçerlilik ve uygulanabilirlik; resmî kanal ile çapraz kontrol | `UAB_SRC` [4] | `LEGAL_REVIEW_REQUIRED` |
| `moving.household` | Aynı kapsam | ODY4/ÜDY4, yetki belgesi ve işletme modeline göre koşullu | UAB / yetkili belgelendirme kanalı | İşletme-yetki modeli ve belge kapsamının resmî karşılaştırması | `UAB_SRC` [4] | `LEGAL_REVIEW_REQUIRED` |
| `moving.household` | Aynı kapsam | Psikoteknik / sağlık şartı, güncel sürücü kuralına göre koşullu | Yetkili sağlık / belgelendirme kanalı | Yalnız resmî geçerlilik sinyali; görüntü tek başına yeterli değildir | Kaynak paketi `moving:1` [1] | `SOURCE_UNVERIFIED` |
| `moving.household` | `moving`: Uluslararası + yurtiçi ticari ev/büro eşyası | C3 Yetki Belgesi | UAB | Yetki belgesi, işletme ve güncel durumun resmî UAB eşleşmesi | `UAB_TYPES`, `UAB_VERIFY` [2] [3] | `LEGAL_REVIEW_REQUIRED` |
| `moving.household` | Aynı kapsam | Yetki belgesine kayıtlı uygun taşıt | UAB | Taşıt/yetki belgesi ilişkisinin resmî UAB sinyaliyle eşleşmesi | `UAB_VERIFY` [3] | `SOURCE_UNVERIFIED` |
| `moving.household` | Aynı kapsam | SRC3; ODY3/ÜDY3, sürücü ve işletme/yetki modeline göre koşullu | UAB / yetkili belgelendirme kanalı | Belge sahibi, kapsam, güncel durum ve model uygulanabilirliği | `UAB_SRC` [4] | `LEGAL_REVIEW_REQUIRED` |
| `transport.freight` | `moving`: Yurtiçi genel ticari eşya (ev/büro dışı) | K1 veya yalnız kamyonet modelinde K1* | UAB | Yetki belgesi türü, işletme ve güncel durumun resmî UAB doğrulaması | `UAB_TYPES`, `UAB_VERIFY` [2] [3] | `LEGAL_REVIEW_REQUIRED` |
| `transport.freight` | Aynı kapsam | Yetki belgesine kayıtlı taşıt | UAB | Araç plaka/ruhsat ve yetki belgesindeki kayıt eşleşmesi | `UAB_VERIFY` [3] | `SOURCE_UNVERIFIED` |
| `transport.freight` | Aynı kapsam | SRC4, uygulanıyorsa | UAB / yetkili belgelendirme kanalı | Güncel kural uygulanabilirliği ve belge geçerliliğinin resmî çapraz kontrolü | `UAB_SRC` [4] | `LEGAL_REVIEW_REQUIRED` |
| `transport.freight` | `moving`: Asansörlü nakliye / mobil vinç-kaldırma | Ekipman tipine uygun iş makinesi/operatör belgesi, gerekliyse | Yetkili kurum / belgelendirme kanalı | Somut ekipman sınıfı, operatör kapsamı ve güncel kural resmî olarak çözülmeden aktivasyon yok | Kaynak paketi `moving:4` [1] | `SOURCE_UNVERIFIED` |
| `transport.freight` | Aynı kapsam | Ekipman tescili / periyodik kontrol, uygulanıyorsa | Yetkili tescil / denetim makamı | Somut ekipman ve yerel/güncel kural resmî olarak çözümlenmeden aktivasyon yok | Kaynak paketi `moving:4` [1] | `SOURCE_UNVERIFIED` |
| `towing.roadside` | `towing`: Ticari araç kurtarma / çekme / taşıma | K1Ö; somut oto-kurtarıcı modelinin UAB kapsam teyidi | UAB | Yetki belgesi türü, oto-kurtarıcı model kapsamı, işletme ve güncel durumun resmî eşleşmesi | `UAB_TYPES`, `UAB_VERIFY` [2] [3] | `LEGAL_REVIEW_REQUIRED` |
| `towing.roadside` | Aynı kapsam | Ruhsatta uygun araç türü ve yetki belgesinde taşıt ilişkisi | UAB / araç tescil kanalı | Ruhsat araç türü, plaka ve yetki belgesindeki taşıt ilişkisinin resmî çapraz kontrolü | `UAB_VERIFY` [3] | `SOURCE_UNVERIFIED` |
| `towing.roadside` | Aynı kapsam | Araç sınıfına uygun sürücü belgesi | Yetkili sürücü belgesi makamı | Belge sahibi ve araç sınıfı için resmî doğrulama sinyali; belge görüntüsü tek başına yeterli değildir | Kaynak paketi `towing:1` [1] | `SOURCE_UNVERIFIED` |
| `towing.roadside` | Aynı kapsam | SRC4/SRC3, güncel KTY uygulanıyorsa | UAB / yetkili belgelendirme kanalı | Güncel kural uygulanabilirliği, sahibi ve geçerlilik için resmî kontrol | `UAB_SRC` [4] | `LEGAL_REVIEW_REQUIRED` |
| `towing.roadside` | Aynı kapsam | Araç Kurtarma ve Taşıma Kamyonu Operatörü veya uygun iş makinesi operatör belgesi, ekipman sınıfı gerektiriyorsa | MEB / yetkili belgelendirme kanalı | Somut ekipman sınıfı ve operatör yetkisi resmî olarak eşleşmeden aktivasyon yok | `MEB_TOW_OPERATOR` [5] | `SOURCE_UNVERIFIED` |
| `towing.roadside` | `roadside_assistance`: Akü takviyesi / basit destek | Ortak kimlik, çalışma hakkı, faaliyet statüsü; platform beceri/güvenlik kontrolü | İlgili resmî makam / Move&Fix güvenlik akışı | Kimlik-belge sahibi eşleşmesi, çalışma hakkı ve faaliyet statüsü; ileri onarıma dönüşürse otomotiv kuralına geçiş | Kaynak paketi `roadside_assistance:1` [1] | `LEGAL_REVIEW_REQUIRED` |
| `towing.roadside` | `roadside_assistance`: Lastik/jant bakım-onarım | 18UY0360-3 veya uygulanıyorsa ilgili MEB lastikçilik/ön düzen ustalık belgesi | MYK / MEB | MYK/e-Devlet veya MEB/e-Devlet resmî sorgu, belge sahibi ve geçerlilik eşleşmesi | `MYK_QUALIFICATIONS`, `MYK_MANDATORY`, `MEB_MASTER` [6] [7] [8] | `LEGAL_REVIEW_REQUIRED` |
| `towing.roadside` | `roadside_assistance`: Yol üstü mekanik arıza tespit/onarım | 11UY0021-4 veya ilgili MEB otomotiv ustalık/diploma-muafiyeti | MYK / MEB | MYK/e-Devlet veya MEB/e-Devlet resmî sorgu, belge sahibi ve güncel zorunluluk/muafiyet kontrolü | `MYK_MANDATORY`, `MYK_QUALIFICATIONS`, `MYK_EXEMPTION`, `MEB_MASTER` [6] [7] [8] | `LEGAL_REVIEW_REQUIRED` |
| `towing.roadside` | `roadside_assistance`: Araç çekme/kurtarma | Çekici kapsamı için yukarıdaki `towing:1` zinciri | UAB / MEB | `towing:1` zinciri eksiksiz ve resmî olarak doğrulanmadan blok | `INHERIT_TOWING` → `towing:1` [1] | `SOURCE_UNVERIFIED` |
| `towing.roadside` | `roadside_assistance`: Yolda yakıt ulaştırma | Bu Blok 1’de kabul edilen belge yok; hizmet pakette devre dışı | — | Otomatik doğrulama veya geçiş penceresi yok; yeni tehlikeli madde/yakıt paketi ve hukuk onayı olmadan blok | `roadside_assistance:6` [1] | `SOURCE_UNVERIFIED` |

## Zorunlu Ortak Çapraz Kontroller

Her satırda resmi karar sinyali; belge türü ve numarası, belge sahibi kimliği, düzenleyen makam, resmî kayıt durumu, süre/iptal/askı, hizmet kapsamı, işletme kapsamı, araç bağlantısı, sürücü/operatör kapsamı, yetki alanı ve kural sürümü üzerinde kurulmalıdır. Kaynak paketi görüntü referansını yalnız yardımcı sinyal sayar ve belirsizliği `BLOCK` kabul eder.[1]

| Kontrol sonucu | Faz 8-A davranışı |
|---|---|
| Resmî kayıt, sahiplik, kapsam ve geçerlilik olumlu; hukuk onayı mevcut | Yalnız approval referansı kayıtlıysa `legal_approved`; `active` için ayrıca ürün onayı gerekir. |
| Herhangi bir resmî sinyal eksik, çelişkili veya doğrulanamaz | `source_unverified` veya `pending_legal_review`; capability aktivasyonu bloklanır. |
| Sahte/değiştirilmiş, iptal/askıda, süresi dolmuş, başkasına ait belge; çalışma hakkı yok; ciddi güvenlik veya fraud riski | `suspended`; geçiş penceresi uygulanmaz ve yalnız ilgili capability derhal durdurulur. |

## Kaynaklar

[1]: ../../server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json "TR Gold Master Country Pack v1"
[2]: https://istanbul.uab.gov.tr/yetki-belgeleri-esya-tasimaciligi-yetki-belgesi-turleri "UAB — Eşya Taşımacılığı Yetki Belgesi Türleri"
[3]: https://uhdgm.uab.gov.tr/yetki-belgeleri-hizmetleri "UAB — Yetki Belgesi Hizmetleri"
[4]: https://uhdgm.uab.gov.tr/sikca-sorulan-sorular-ve-cevaplari "UAB — SRC / ODY / ÜDY Sık Sorulan Sorular"
[5]: https://ookgm.meb.gov.tr/kurumlar.php "MEB — Araç Kurtarma ve Taşıma Kamyonu Operatörü"
[6]: https://portal.myk.gov.tr/index.php?belge_zorunlu=1&option=com_yeterlilik&view=arama "MYK — Belge Zorunluluğu Kapsamındaki Meslekler"
[7]: https://portal.myk.gov.tr/index.php?option=com_yeterlilik&view=arama "MYK — Ulusal Yeterlilik Arama"
[8]: https://www.turkiye.gov.tr/milli-egitim-kalfalik-ustalik-usta-ogrencilik-ve-is-yeri-acma-belgesi-sorgulama "e-Devlet — MEB Ustalık Belgesi Sorgulama"
