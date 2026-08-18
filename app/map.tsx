import { Redirect } from "expo-router";

/** Legacy map deep-link compatibility route. Live job tracking owns map data. */
export default function LegacyMapRoute() {
  return <Redirect href="/" />;
}
