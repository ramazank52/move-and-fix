import { Redirect } from "expo-router";

/** Legacy notification deep-link compatibility route. */
export default function LegacyNotificationsRoute() {
  return <Redirect href="/settings/notifications" />;
}
