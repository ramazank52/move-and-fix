import { Redirect } from "expo-router";

/**
 * Geriye dönük yol yardım deep-link'i. Tüm hizmet talepleri tek API-first akışta oluşturulur.
 */
export default function LegacyRoadsideServiceRoute() {
  return <Redirect href={"/create-service?categoryId=roadside" as never} />;
}
