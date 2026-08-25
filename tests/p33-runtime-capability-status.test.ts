import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { resolveRuntimeCapabilityStatuses } from "../server/capabilities/RuntimeCapabilityStatus";

describe("P33 runtime capability status", () => {
  it("is default-off for credentialed external services and explicit about unsupported native AR", () => {
    const statuses = resolveRuntimeCapabilityStatuses({});
    expect(statuses.find((item) => item.key === "payment")).toMatchObject({ state: "NOT_CONFIGURED" });
    expect(statuses.find((item) => item.key === "push")).toMatchObject({ state: "NOT_CONFIGURED" });
    expect(statuses.find((item) => item.key === "camera_ar")).toMatchObject({ state: "NOT_SUPPORTED", reasonCode: "VERIFIED_NATIVE_AR_ADAPTER_UNAVAILABLE" });
  });

  it("never treats configuration presence as delivery proof", () => {
    const statuses = resolveRuntimeCapabilityStatuses({
      IYZICO_API_KEY: "present",
      IYZICO_SECRET_KEY: "present",
      SENDGRID_API_KEY: "present",
      OPENAI_API_KEY: "present",
      MEDIA_SCANNER_SUBMISSION_URL: "https://isolated.example.test/scan",
    });
    expect(statuses.find((item) => item.key === "payment")?.reasonCode).toBe("PAYMENT_CONFIG_PRESENT_NO_DELIVERY_PROOF");
    expect(statuses.find((item) => item.key === "email")?.reasonCode).toBe("EMAIL_CONFIG_PRESENT_NO_DELIVERY_PROOF");
    expect(statuses.find((item) => item.key === "documents")?.reasonCode).toBe("DOCUMENT_SCANNER_CONFIG_PRESENT_NO_SCAN_PROOF");
  });

  it("exposes the server-owned protected query in the actual general settings controller", () => {
    const routerSource = readFileSync("server/routers.ts", "utf8");
    const screenSource = readFileSync("app/settings/general.tsx", "utf8");
    expect(routerSource).toContain("runtimeCapabilities: router({");
    expect(routerSource).toContain("get: protectedProcedure.query");
    expect(screenSource).toContain("trpc.runtimeCapabilities.get.useQuery()");
    expect(screenSource).toContain("RuntimeCapabilityStatusCard");
  });
});
