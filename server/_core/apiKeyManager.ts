/**
 * API Key Manager — Kritik Bulgu #6
 *
 * API anahtarı yaşam döngüsü yönetimi:
 * - Anahtar oluşturma (prefix + HMAC-SHA256)
 * - Doğrulama (hash karşılaştırma)
 * - İptal etme
 * - Rotasyon (eski anahtarı grace period ile iptal, yeni anahtar üret)
 * - Süre dolması kontrolü
 *
 * Production'da anahtar hash'leri veritabanında saklanır;
 * bu implementasyon in-memory Map kullanır (Redis/DB ile değiştirilebilir).
 */

import crypto from 'crypto';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // İlk 8 karakter (tanımlama için)
  hashedKey: string; // SHA-256 hash
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  scopes: string[];
  createdBy: string;
}

export interface ApiKeyCreateResult {
  id: string;
  key: string; // Sadece oluşturma sırasında döndürülür
  prefix: string;
  name: string;
  createdAt: Date;
  expiresAt: Date | null;
  scopes: string[];
}

class ApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private keyPrefix = 'mfk_'; // Move&Fix Key

  /**
   * Yeni API anahtarı oluştur
   */
  create(params: {
    name: string;
    createdBy: string;
    scopes?: string[];
    expiresInDays?: number;
  }): ApiKeyCreateResult {
    const rawKey = this.keyPrefix + crypto.randomBytes(32).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0, 12);
    const id = `key-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 86400000)
      : null;

    const apiKey: ApiKey = {
      id,
      name: params.name,
      prefix,
      hashedKey,
      createdAt: new Date(),
      expiresAt,
      lastUsedAt: null,
      revokedAt: null,
      scopes: params.scopes || ['read'],
      createdBy: params.createdBy,
    };

    this.keys.set(id, apiKey);

    return {
      id,
      key: rawKey,
      prefix,
      name: params.name,
      createdAt: apiKey.createdAt,
      expiresAt,
      scopes: apiKey.scopes,
    };
  }

  /**
   * API anahtarını doğrula
   */
  validate(rawKey: string): { valid: boolean; keyId?: string; scopes?: string[] } {
    if (!rawKey.startsWith(this.keyPrefix)) {
      return { valid: false };
    }

    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    for (const [id, apiKey] of this.keys) {
      if (apiKey.hashedKey === hashedKey && !apiKey.revokedAt) {
        // Süre dolması kontrolü
        if (apiKey.expiresAt && Date.now() > apiKey.expiresAt.getTime()) {
          return { valid: false };
        }

        // Last used güncelle
        apiKey.lastUsedAt = new Date();
        return { valid: true, keyId: id, scopes: apiKey.scopes };
      }
    }

    return { valid: false };
  }

  /**
   * API anahtarını iptal et
   */
  revoke(keyId: string): boolean {
    const apiKey = this.keys.get(keyId);
    if (!apiKey || apiKey.revokedAt) {
      return false;
    }
    apiKey.revokedAt = new Date();
    return true;
  }

  /**
   * API anahtarını rotasyon yap — eskiyi iptal et, yeni oluştur
   */
  rotate(keyId: string, gracePeriodDays: number = 0): ApiKeyCreateResult | null {
    const oldKey = this.keys.get(keyId);
    if (!oldKey || oldKey.revokedAt) {
      return null;
    }

    // Grace period varsa eski anahtarı o süre kadar daha geçerli tut
    if (gracePeriodDays > 0) {
      oldKey.expiresAt = new Date(Date.now() + gracePeriodDays * 86400000);
    } else {
      oldKey.revokedAt = new Date();
    }

    // Yeni anahtar oluştur (aynı isim ve scope'larla)
    return this.create({
      name: oldKey.name,
      createdBy: oldKey.createdBy,
      scopes: oldKey.scopes,
    });
  }

  /**
   * Tüm anahtarları listele (hash olmadan)
   */
  list(): Omit<ApiKey, 'hashedKey'>[] {
    return Array.from(this.keys.values()).map(({ hashedKey: _h, ...rest }) => rest);
  }

  /**
   * Anahtarı ID ile getir (hash olmadan)
   */
  getById(keyId: string): Omit<ApiKey, 'hashedKey'> | null {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) return null;
    const { hashedKey: _h, ...rest } = apiKey;
    return rest;
  }
}

export const apiKeyManager = new ApiKeyManager();
