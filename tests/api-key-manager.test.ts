import { describe, expect, it } from 'vitest';
import { apiKeyManager } from '../server/_core/apiKeyManager';

describe('API Key Manager (Critical 6)', () => {
  it('creates an API key with correct format', () => {
    const result = apiKeyManager.create({
      name: 'test-key',
      createdBy: 'owner-1',
      scopes: ['read', 'write'],
    });

    expect(result.id).toBeDefined();
    expect(result.key).toMatch(/^mfk_[0-9a-f]{64}$/);
    expect(result.prefix).toBe(result.key.substring(0, 12));
    expect(result.name).toBe('test-key');
    expect(result.scopes).toEqual(['read', 'write']);
  });

  it('validates a created key', () => {
    const result = apiKeyManager.create({
      name: 'validate-test',
      createdBy: 'owner-1',
    });

    const validation = apiKeyManager.validate(result.key);
    expect(validation.valid).toBe(true);
    expect(validation.keyId).toBe(result.id);
  });

  it('rejects invalid key format', () => {
    const validation = apiKeyManager.validate('invalid-key');
    expect(validation.valid).toBe(false);
  });

  it('rejects revoked key', () => {
    const result = apiKeyManager.create({
      name: 'revoke-test',
      createdBy: 'owner-1',
    });

    const wasRevoked = apiKeyManager.revoke(result.id);
    expect(wasRevoked).toBe(true);

    const validation = apiKeyManager.validate(result.key);
    expect(validation.valid).toBe(false);
  });

  it('rotates a key and invalidates old key', () => {
    const result = apiKeyManager.create({
      name: 'rotate-test',
      createdBy: 'owner-1',
    });

    // Rotasyon yap (grace period yok)
    const newKey = apiKeyManager.rotate(result.id, 0);
    expect(newKey).not.toBeNull();
    expect(newKey!.key).not.toBe(result.key);

    // Eski anahtar artık geçersiz
    const oldValidation = apiKeyManager.validate(result.key);
    expect(oldValidation.valid).toBe(false);

    // Yeni anahtar geçerli
    const newValidation = apiKeyManager.validate(newKey!.key);
    expect(newValidation.valid).toBe(true);
  });

  it('rotates with grace period keeps old key valid', () => {
    const result = apiKeyManager.create({
      name: 'grace-test',
      createdBy: 'owner-1',
    });

    // 7 gün grace period ile rotasyon
    const newKey = apiKeyManager.rotate(result.id, 7);
    expect(newKey).not.toBeNull();

    // Eski anahtar hala geçerli (grace period içinde)
    const oldValidation = apiKeyManager.validate(result.key);
    expect(oldValidation.valid).toBe(true);

    // Yeni anahtar da geçerli
    const newValidation = apiKeyManager.validate(newKey!.key);
    expect(newValidation.valid).toBe(true);
  });

  it('lists keys without exposing hashes', () => {
    const result = apiKeyManager.create({
      name: 'list-test',
      createdBy: 'owner-1',
    });

    const keys = apiKeyManager.list();
    const found = keys.find((k) => k.id === result.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('list-test');
    // Hash暴露 edilmemeli
    expect((found as Record<string, unknown>).hashedKey).toBeUndefined();
  });

  it('does not double-revoke', () => {
    const result = apiKeyManager.create({
      name: 'double-revoke',
      createdBy: 'owner-1',
    });

    expect(apiKeyManager.revoke(result.id)).toBe(true);
    expect(apiKeyManager.revoke(result.id)).toBe(false);
  });
});
