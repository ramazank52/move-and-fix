import { Redirect } from "expo-router";

/** Live tracking is resolved from an authorized active-job context. */
export default function LegacyServiceTrackingRoute() {
  return <Redirect href="/" />;
}
