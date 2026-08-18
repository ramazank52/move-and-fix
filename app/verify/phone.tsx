import { Redirect } from "expo-router";

/**
 * Legacy deep-link compatibility only.
 *
 * Phone verification is handled exclusively by the canonical, server-backed
 * OTP route. Keeping this redirect avoids broken old links without exposing
 * a local success path or locally generated SMS behavior.
 */
export default function LegacyPhoneVerificationRedirect() {
  return <Redirect href="/verify-phone" />;
}
