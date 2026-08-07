# Move&Fix — Deployment Guide

Issue #30: No step-by-step deployment instructions.  
Bu doküman, Move&Fix sistemini production ortamına dağıtmak için adım adım rehberdir.

## Ön Koşullar

- Node.js 22+
- MySQL 8.0+
- Docker & Docker Compose (opsiyonel ama önerilir)
- Domain ve SSL sertifikası (Let's Encrypt önerilir)

## 1. Ortam Değişkenleri

`.env` dosyasını `.env.example`'dan kopyalayın ve doldurun:

```bash
cp .env.example .env
```

Kritik değişkenler:
- `DATABASE_URL` — MySQL bağlantı string'i
- `JWT_SECRET` — Session token imzalama anahtarı
- `ALLOWED_ORIGINS` — CORS whitelist (virgülle ayrılmış)
- `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` — Türkiye ödemeleri
- `STRIPE_SECRET_KEY` — Uluslararası ödemeler
- `PORT` — API portu (default: 3000)

## 2. Veritabanı Kurulumu

```bash
# Migration oluştur
pnpm drizzle-kit generate

# Migration uygula
pnpm drizzle-kit migrate
```

## 3. Backend Başlatma

### Docker ile (önerilir)

```bash
docker-compose up -d
```

### Manuel

```bash
# Bağımlılıkları yükle
pnpm install

# Build
pnpm build

# Production başlat
NODE_ENV=production pnpm start
```

## 4. Mobil Uygulama

### Expo Build

```bash
# Android APK
eas build --platform android --profile production

# iOS (TestFlight)
eas build --platform ios --profile production
```

### App Store / Play Store

1. `app.config.ts` dosyasında `appName`, `iosBundleId`, `androidPackage` değerlerini doğrulayın.
2. `eas submit` komutuyla mağazalara gönderin.

## 5. MoveOS Admin Panel

```bash
cd /home/ubuntu/moveos
pnpm install
pnpm build
pnpm start
```

MoveOS, backend API'ye `NEXT_PUBLIC_API_URL` environment variable'ı üzerinden bağlanır.

## 6. Health Check

```bash
curl http://localhost:3000/api/health
# {"ok": true, "timestamp": ...}

curl http://localhost:3000/api/health/detailed
# Detaylı sistem durumu
```

## 7. API Dokümantasyonu

Swagger UI: `http://localhost:3000/api-docs/ui`  
OpenAPI Spec: `http://localhost:3000/api-docs/json`

## 8. Güvenlik Kontrolleri

- [x] CSRF koruması aktif (cookie-based web istekleri)
- [x] Rate limiting (general: 100/dk, login: 10/15dk)
- [x] CSP headers
- [x] CORS whitelist
- [x] Security audit logging
- [x] API key rotation
- [x] Webhook signature verification
- [x] Data masking in logs

## 9. Monitoring

- `/api/health/detailed` — Sistem sağlığı
- `/api-docs/ui` — API dokümantasyonu
- Docker logs: `docker-compose logs -f`
- Analytics Service: `AnalyticsService.getMetrics()`

## 10. Rollback

```bash
# Checkpoint rollback
webdev_rollback_checkpoint --version_id <version>

# Database migration rollback
# (Drizzle migration'ları geriye dönük değildir — yedekten geri yükle)
```
