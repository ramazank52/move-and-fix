import { Redirect } from "expo-router";

/** Legacy calendar deep-link compatibility route. Scheduling is scoped to a live job. */
export default function LegacyCalendarRoute() {
  return <Redirect href="/" />;
}
