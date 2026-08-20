import { describe, expect, it } from "vitest";

import { EncryptionService } from "../server/_core/security";

describe("P15 encrypted payload key-version and rotation contract", () => {
  it("emits a versioned AES-GCM envelope and decrypts it with the active key", () => {
    const service = new EncryptionService("active-material", { keyVersion: "2026-08" });
    const encrypted = service.encrypt("restricted payload");

    expect(encrypted.split(":")).toHaveLength(4);
    expect(encrypted.startsWith("2026-08:")).toBe(true);
    expect(service.decrypt(encrypted)).toBe("restricted payload");
  });

  it("decrypts a previous-version envelope only when explicit rotation material is configured", () => {
    const former = new EncryptionService("former-material", { keyVersion: "2026-07" });
    const legacyEncrypted = former.encrypt("pre-rotation record");
    const rotated = new EncryptionService("active-material", {
      keyVersion: "2026-08",
      previousKeyMaterial: "former-material",
      previousKeyVersion: "2026-07",
    });

    expect(rotated.decrypt(legacyEncrypted)).toBe("pre-rotation record");
    expect(() => new EncryptionService("active-material", { keyVersion: "2026-08" }).decrypt(legacyEncrypted))
      .toThrow("ENCRYPTION_KEY_VERSION_UNAVAILABLE");
  });

  it("keeps current and previous versioned envelopes readable while blocking an unknown version", () => {
    const former = new EncryptionService("former-material", { keyVersion: "2026-07" });
    const rotated = new EncryptionService("active-material", {
      keyVersion: "2026-08",
      previousKeyMaterial: "former-material",
      previousKeyVersion: "2026-07",
    });
    const current = rotated.encrypt("current-version");
    const previous = former.encrypt("previous-version");
    const unknownVersion = current.replace("2026-08:", "unknown:");

    expect(rotated.decrypt(current)).toBe("current-version");
    expect(rotated.decrypt(previous)).toBe("previous-version");
    expect(() => rotated.decrypt(unknownVersion)).toThrow("ENCRYPTION_KEY_VERSION_UNAVAILABLE");
  });

  it("decrypts an existing unversioned record only with explicitly configured legacy material", () => {
    const oldService = new EncryptionService("old-legacy-material", { keyVersion: "2026-07" });
    const versioned = oldService.encrypt("legacy compatible");
    const legacyThreePart = versioned.split(":").slice(1).join(":");
    const rotated = new EncryptionService("new-active-material", {
      keyVersion: "2026-08",
      legacyKey: "old-legacy-material",
    });

    expect(rotated.decrypt(legacyThreePart)).toBe("legacy compatible");
    expect(() => new EncryptionService("new-active-material", { keyVersion: "2026-08" }).decrypt(legacyThreePart))
      .toThrow("ENCRYPTION_LEGACY_KEY_UNAVAILABLE");
    expect(() => rotated.decrypt("plaintext-is-not-ciphertext")).toThrow("ENCRYPTED_PAYLOAD_INVALID");
    expect(() => rotated.decrypt("v2:0011:0011:deadbeef")).toThrow("ENCRYPTED_PAYLOAD_INVALID");
  });

  it("re-encrypts a legacy payload with the active envelope and verifies the round trip", () => {
    const oldService = new EncryptionService("old-legacy-material", { keyVersion: "2026-07" });
    const legacyThreePart = oldService.encrypt("migrate me").split(":").slice(1).join(":");
    const rotated = new EncryptionService("new-active-material", {
      keyVersion: "2026-08",
      legacyKey: "old-legacy-material",
    });

    const migrated = rotated.migrateLegacyPayload(legacyThreePart);
    expect(migrated.startsWith("2026-08:")).toBe(true);
    expect(migrated.split(":")).toHaveLength(4);
    expect(rotated.decrypt(migrated)).toBe("migrate me");
    expect(() => rotated.migrateLegacyPayload(migrated)).toThrow("ENCRYPTED_PAYLOAD_NOT_LEGACY");
  });

  it("rejects a tampered authentication tag without trying other keys", () => {
    const service = new EncryptionService("active-material", { keyVersion: "2026-08" });
    const [version, iv, authTag, encrypted] = service.encrypt("authenticated payload").split(":");
    const tamperedTag = `${authTag.slice(0, -2)}00`;

    expect(() => service.decrypt([version, iv, tamperedTag, encrypted].join(":"))).toThrow();
  });

  it("keeps versioned active-key envelopes isolated from legacy key material", () => {
    const active = new EncryptionService("active-material", {
      keyVersion: "2026-08",
      legacyKey: "old-legacy-material",
    });

    const activeEnvelope = active.encrypt("active-only payload");
    expect(active.decrypt(activeEnvelope)).toBe("active-only payload");
  });

  it("refuses incomplete or duplicate rotation configuration", () => {
    expect(() => new EncryptionService("active", { keyVersion: "v2", previousKeyMaterial: "old" }))
      .toThrow("ENCRYPTION_ROTATION_CONFIGURATION_INVALID");
    expect(() => new EncryptionService("active", {
      keyVersion: "v2",
      previousKeyMaterial: "old",
      previousKeyVersion: "v2",
    })).toThrow("ENCRYPTION_ROTATION_CONFIGURATION_INVALID");
  });
});
