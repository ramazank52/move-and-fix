import { Redirect } from "expo-router";

/** Legacy report deep-link compatibility route. Reports require live request data. */
export default function LegacyHistoryReportRoute() {
  return <Redirect href="/" />;
}
