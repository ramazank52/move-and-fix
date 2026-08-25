import { Platform } from "react-native";

export type AreaMeasurementCapabilityStatus =
  | "MANUAL_ONLY"
  | "AR_READY"
  | "PERMISSION_REQUIRED"
  | "NOT_SUPPORTED"
  | "TEMPORARILY_UNAVAILABLE";

export type AreaMeasurementCapability = {
  status: AreaMeasurementCapabilityStatus;
  reasonCode?: "NATIVE_ADAPTER_MISSING" | "UNSUPPORTED_PLATFORM" | "PERMISSION_DENIED" | "TRACKING_UNAVAILABLE";
};

export type NativeAreaMeasurementAdapter = {
  getCapability: () => Promise<{ available: boolean; permissionGranted: boolean; trackingReady: boolean }>;
};

export async function resolveAreaMeasurementCapability(adapter?: NativeAreaMeasurementAdapter): Promise<AreaMeasurementCapability> {
  if (Platform.OS === "web") {
    return { status: "MANUAL_ONLY", reasonCode: "UNSUPPORTED_PLATFORM" };
  }

  if (!adapter) {
    return { status: "MANUAL_ONLY", reasonCode: "NATIVE_ADAPTER_MISSING" };
  }

  try {
    const capability = await adapter.getCapability();
    if (!capability.available) return { status: "NOT_SUPPORTED", reasonCode: "UNSUPPORTED_PLATFORM" };
    if (!capability.permissionGranted) return { status: "PERMISSION_REQUIRED", reasonCode: "PERMISSION_DENIED" };
    if (!capability.trackingReady) return { status: "TEMPORARILY_UNAVAILABLE", reasonCode: "TRACKING_UNAVAILABLE" };
    return { status: "AR_READY" };
  } catch {
    return { status: "TEMPORARILY_UNAVAILABLE", reasonCode: "TRACKING_UNAVAILABLE" };
  }
}
