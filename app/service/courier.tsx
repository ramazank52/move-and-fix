import { Redirect } from "expo-router";

/**
 * Geriye dönük kurye deep-link'i. Tüm hizmet talepleri tek API-first akışta oluşturulur.
 */
export default function LegacyCourierServiceRoute() {
  return <Redirect href={"/create-service?categoryId=courier" as never} />;
}
