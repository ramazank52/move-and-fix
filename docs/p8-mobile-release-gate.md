# Move&Fix Mobil Mağaza Çıkış Kapısı

Bu kontrol listesi yalnız kaynak ve paket doğrulamasını kapsar. Mağazaya gönderim, DNS/HTTPS, geliştirici hesapları, imzalama ve fiziksel cihaz kabulü bu ortamın dışındadır ve aşağıdaki satırlar tamamlanmadan yayın kararı verilmez.

## Kaynakta Doğrulanan Mobil Sözleşmeler

| Konu | Kaynak durumu | Doğrulama |
|---|---|---|
| Uygulama adı/kimliği | `Move&Fix`, `com.app.moveandfix`, `moveandfix` deep-link şeması | `app.config.ts` |
| Yönlendirme/çoklu platform | Expo Router, iOS ve Android export | Statik export kalite kapısı |
| Konum | Foreground kullanım metni; Android coarse/fine permission | `app.config.ts` ve açık rıza akışı |
| Mikrofon | Kullanım metni; Android `RECORD_AUDIO` | `app.config.ts` ve MoveAI ses kaydı |
| Bildirim | `POST_NOTIFICATIONS`, Expo notifications eklentisi | `app.config.ts`; gerçek token/teslimat dış kapı |
| Ödeme dönüşü | Tek `moveandfix` şeması; Apple Pay merchant kimliği | Kaynak yapılandırması; Apple provisioning dış kapı |
| Gizlilik URL'si | `https://moveandfix.app/privacy-policy` | Kaynakta tanımlı; DNS/HTTPS doğrulaması dış kapı |

## Privacy Manifest ve Üçüncü Taraf SDK Kontrolü

Expo SDK ve native modüllerin privacy manifest bildirimleri nihai iOS build artifact'ında kontrol edilmelidir. Bu managed kaynak ağacı doğrudan bir imzalı Xcode artifact'ı üretmez; bu nedenle aşağıdaki kontrol, Apple geliştirici hesabı/EAS veya eşdeğer imzalı build ortamında yapılacak **external release gate**'tir.

1. İmzalı iOS archive içindeki `PrivacyInfo.xcprivacy` dosyalarını ve Apple'ın required-reason API raporunu inceleyin.
2. Expo SDK, `@stripe/stripe-react-native`, konum, bildirim, secure storage ve kullanılan diğer native SDK'lar için manifest/beyan uyumluluğunu archive düzeyinde doğrulayın.
3. App Store Connect privacy nutrition label alanlarını yalnız gerçek veri akışı, retention ve kullanıcı kontrolü kayıtlarına dayanarak doldurun.
4. Google Play Data safety formunu müşteri/profesyonel rolü, konum rızası, medya rızası, ödeme sağlayıcısı ve saklama politikasıyla çapraz doğrulayın.

## Gönderim Öncesi Manuel Kapılar

| Kapı | Sahip | Geçiş kanıtı | Mevcut durum |
|---|---|---|---|
| iOS distribution certificate/provisioning | Release sorumlusu | İmzalı archive ve TestFlight yüklemesi | External configuration required |
| Android signing key ve Play Console | Release sorumlusu | İmzalı AAB ve internal track sonucu | External configuration required |
| DNS/HTTPS privacy URL | Domain sorumlusu | Genel erişimli HTTPS yanıtı | External configuration required |
| Onaylı EN gizlilik metni | Hukuk sorumlusu | Sürümlü onay kaydı | External configuration required |
| Fiziksel cihaz izin akışları | QA sorumlusu | iOS/Android cihaz kanıtı | External configuration required |
| Apple Pay merchant provisioning | Ödeme sorumlusu | Stripe/Apple doğrulama sonucu | External configuration required |
| Push token/teslimat | Bildirim sorumlusu | Expo/FCM cihaz teslimat kanıtı | External configuration required |
| Expo/Metro toolchain audit | Teknik sorumlu | Desteklenen Expo SDK/Metro sürümünde yüksek audit bulgusu olmaması veya kabul edilmiş risk kararı | External toolchain risk — `docs/p8-supply-chain-status.md` |

## Tekrarlanabilir Kaynak Kalite Kapıları

```sh
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm supply:verify
pnpm audit --prod --audit-level=high
npx expo export --platform ios --output-dir /tmp/movefix-ios-release
npx expo export --platform android --output-dir /tmp/movefix-android-release
```

Bu komutların başarılı olması mağaza kabulü veya gerçek sağlayıcı teslimatı anlamına gelmez. Her harici kapı, gerçek kimlik bilgileri sağlandığında ayrı kanıtla kapatılmalıdır.
