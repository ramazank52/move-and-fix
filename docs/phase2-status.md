# Faz 2 Durumu — Uyum ve Yetki Kontrolü

**Durum: B — teknik temel uygulanmış; ülke hukuku ve dış kayıt doğrulaması eksik olduğundan canlı yetkilendirme açılmıyor.**

| Alan | Durum | Doğrulama |
|---|---:|---|
| Capability ve yargı alanı veri modeli | A | Additive migration `0023` yönetilen veritabanına uygulandı. |
| Bilinmeyen durum fail-closed | A | Saf policy sözleşme testleri geçti. |
| İnsan inceleme ve itiraz | A | Sağlayıcı sahipliği ve yönetici MFA sınırı tRPC/MoveOS sözleşme testleriyle kapsandı. |
| Ülke paketi ve açma kapısı | A | MFA korumalı MoveOS API ve kritik eksik kalemde engelleyen gate eklendi. |
| Sürekli yeniden doğrulama | B | Due credential bağlı capability’yi `MANUAL_REVIEW` durumuna indirir; imzalı endpoint, secret yokken HTTP 503 ile fail-closed döner. Zamanlanmış görev henüz yapılandırılmadı. |
| Hassas kanıt minimizasyonu | B | Retention sonrası uygulama katmanı belge URL’sini gizler. Mevcut depolama adaptöründe fiziksel silme işlemi bulunmadığı için blob silme dış bağımlılık olarak kalır. |
| Türkiye pilot hukuk içeriği | C | Kullanıcı tarafından sağlanmış onaylı Gold Master / resmî kaynak / hukuk onayı bulunmadığından hiçbir hukuki kural veya aktif yetki seed’i üretilmedi. |

## External Blockers

1. `COMPLIANCE_REVERIFICATION_CRON_SECRET` ve güvenilir scheduler yapılandırması.
2. İhraç eden kurum veya yetkili doğrulama sağlayıcısı için sözleşmeli resmi kaynak/adaptör.
3. Saklama süresi sonunda fiziksel blob silmeye izin veren depolama API’si veya veri işleme sözleşmesi.
4. Türkiye için hukuk tarafından onaylanmış, sürümlenmiş Gold Master ve resmî kaynak kayıtları.

> Bu eksikler çözülmeden ülke açma kapısı aktif yetki vermez; sistem varsayılan olarak izin vermek yerine engeller.
