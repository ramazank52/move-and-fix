import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

import { resolveAreaMeasurementCapability } from "../lib/area-measurement-capability";

describe("area measurement capability gate", () => {
  it("requires a real native adapter before advertising AR measurement", async () => {
    await expect(resolveAreaMeasurementCapability()).resolves.toEqual({ status: "MANUAL_ONLY", reasonCode: "NATIVE_ADAPTER_MISSING" });
  });

  it("does not accept AR until permission and tracking are both verified", async () => {
    await expect(resolveAreaMeasurementCapability({ getCapability: async () => ({ available: true, permissionGranted: false, trackingReady: true }) })).resolves.toEqual({
      status: "PERMISSION_REQUIRED",
      reasonCode: "PERMISSION_DENIED",
    });
    await expect(resolveAreaMeasurementCapability({ getCapability: async () => ({ available: true, permissionGranted: true, trackingReady: true }) })).resolves.toEqual({ status: "AR_READY" });
  });
});
