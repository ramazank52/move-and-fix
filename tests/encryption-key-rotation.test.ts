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

  it("supports existing unversioned encrypted records but never plaintext or malformed fallback", () => {
    const service = new EncryptionService("legacy-material", { keyVersion: "v2" });
    const versioned = service.encrypt("legacy compatible");
    const legacyThreePart = versioned.split(":").slice(1).join(":");

    expect(service.decrypt(legacyThreePart)).toBe("legacy compatible");
    expect(() => service.decrypt("plaintext-is-not-ciphertext")).toThrow("ENCRYPTED_PAYLOAD_INVALID");
    expect(() => service.decrypt("v2:0011:0011:deadbeef")).toThrow("ENCRYPTED_PAYLOAD_INVALID");
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
