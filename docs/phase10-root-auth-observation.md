# Phase 10 Kök Route Oturum İncelemesi

- `app/index.tsx`, `useAuth()` içindeki `loading` değeri false olduğunda `resolveEntryRoute(user)` ile yönlendirme yapar.
- `useAuth()` hata yolunda kullanıcıyı `null` yapar ve `finally` bloğunda yüklemeyi kapatır; geçersiz web oturum çerezi bu yolun hedefidir.
- API katmanı ve sunucu doğrulaması geçersiz imzayı `null`/yetkisiz yanıtla fail-closed ele alır.
- Checkpoint önizleme yakalaması yükleme göstergesinde kalmıştır. Bu nedenle root bootstrap yönlendirmesi için otomatik regresyon kapsamı genişletilecek; görünür yükleme yalnız kontrol sürerken gösterilecektir.

Canlı takip için normal kullanıcı akışı `app/tracking/live.tsx` route’una yönlenmektedir. Bu ekran tRPC ile gerçek iş, konum, yaşam döngüsü, iş kanıtı ve müşteri onayı verilerini kullanır. `app/service/tracking.tsx` ise normal akışta başvurusu bulunmayan eski örnek ekrandır; üretim verisi gösteren route’u değiştirmemek için yerelleştirme gerçek route üzerinde sürdürülecektir.
