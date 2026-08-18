import { Redirect } from "expo-router";

/** Portfolio entries are only accessible from an authorized professional profile. */
export default function LegacyPortfolioEntryRoute() {
  return <Redirect href="/" />;
}
