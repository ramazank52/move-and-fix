import { describe, expect, it } from "vitest";

import {
  assertProductionEnvironmentContract,
  validateEnvironmentContract,
} from "../server/security/EnvironmentContract";

describe("P13 canonical environment contract", () => {
  it("maps a deprecated internal name while reporting it without logging a secret", () => {
    const validation = validateEnvironmentContract({
      MEDIA_SCANNER_WEBHOOK_SECRET: "opaque-secret",
      NETGSM_MSGHEADER: "MOVEFIX",
    });

    expect(validation.values.mediaScannerCallbackSecret).toBe("opaque-secret");
    expect(validation.values.netgsmMsgHeader).toBe("MOVEFIX");
    expect(validation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "DEPRECATED_ALIAS", canonicalName: "MEDIA_SCANNER_CALLBACK_SECRET" }),
      expect.objectContaining({ code: "DEPRECATED_ALIAS", canonicalName: "NETGSM_MSG_HEADER" }),
    ]));
    expect(JSON.stringify(validation.issues)).not.toContain("opaque-secret");
  });

  it("rejects production startup for conflicting aliases or a partial provider configuration", () => {
    const conflicting = validateEnvironmentContract({
      MEDIA_SCANNER_CALLBACK_SECRET: "canonical",
      MEDIA_SCANNER_WEBHOOK_SECRET: "legacy-different",
    });
    expect(() => assertProductionEnvironmentContract(conflicting)).toThrow("ENVIRONMENT_CONTRACT_INVALID");

    const partialIyzico = validateEnvironmentContract({ IYZICO_API_KEY: "key-only" });
    expect(partialIyzico.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PARTIAL_PROVIDER_CONFIGURATION", canonicalName: "IYZICO" }),
    ]));
    expect(() => assertProductionEnvironmentContract(partialIyzico)).toThrow("ENVIRONMENT_CONTRACT_INVALID");
  });

  it("permits an entirely unconfigured external provider without manufacturing configuration", () => {
    const validation = validateEnvironmentContract({});
    expect(validation.hasFatalConfigurationError).toBe(false);
    expect(validation.values.proxyCommProviderApiKey).toBe("");
    expect(validation.values.mediaScannerCallbackSecret).toBe("");
    expect(validation.values.encryptionLegacyKey).toBe("");
  });

  it("rejects a partial encryption rotation while permitting an entirely unconfigured optional operation", () => {
    const partialRotation = validateEnvironmentContract({ ENCRYPTION_KEY_PREVIOUS: "previous-only" });
    expect(partialRotation.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PARTIAL_PROVIDER_CONFIGURATION", canonicalName: "ENCRYPTION_ROTATION" }),
    ]));
    expect(() => assertProductionEnvironmentContract(partialRotation)).toThrow("ENVIRONMENT_CONTRACT_INVALID");

    const optionalOperations = validateEnvironmentContract({});
    expect(optionalOperations.values.documentRetentionCronSecret).toBe("");
    expect(optionalOperations.values.apmApiKey).toBe("");
  });
});
