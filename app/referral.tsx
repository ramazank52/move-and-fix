import { Redirect } from "expo-router";

/** Legacy referral deep-link compatibility route without fabricated referral data. */
export default function LegacyReferralRoute() {
  return <Redirect href="/" />;
}
