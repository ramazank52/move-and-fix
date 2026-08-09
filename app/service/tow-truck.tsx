import { Redirect } from "expo-router";

/**
 * Geriye dönük çekici deep-link'i. Tüm hizmet talepleri tek API-first akışta oluşturulur.
 */
export default function LegacyTowTruckServiceRoute() {
  return <Redirect href={"/create-service?categoryId=tow_truck" as never} />;
}
