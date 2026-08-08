import "dotenv/config";
import { writeFile } from "node:fs/promises";

import { sdk } from "../server/_core/sdk";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test token generation is disabled in production");
  }

  const expiresInMs = 60 * 60 * 1000;
  const [customer, provider, admin] = await Promise.all([
    sdk.createSessionToken("test-customer-open-id", { name: "Ahmet Müşteri", expiresInMs }),
    sdk.createSessionToken("test-provider-open-id", { name: "Mehmet Usta", expiresInMs }),
    sdk.createSessionToken("test-admin-open-id", { name: "Admin Yönetici", expiresInMs }),
  ]);

  await writeFile(
    "/tmp/test-tokens.json",
    JSON.stringify({ customer, provider, admin }, null, 2),
    { mode: 0o600 },
  );

  console.log("Development E2E session tokens generated at /tmp/test-tokens.json");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
