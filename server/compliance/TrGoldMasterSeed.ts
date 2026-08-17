import type { Connection } from "mysql2/promise";

/**
 * Türkiye Gold Master, operasyonel lansman izni değildir. Bu paket yalnız
 * doğrulanmış resmi kaynakları ve insan/hukuk incelemesi bekleyen capability
 * kurallarını kaydeder. `enabled` durumuna geçiş, mevcut country launch gate
 * ve ayrı MFA-korumalı legal approval akışından geçmek zorundadır.
 */
export const TR_GOLD_MASTER_VERSION = "tr-gold-master-2026-08";

type CapabilityRuleSeed = {
  key: string;
  displayName: string;
  credentialType: string | null;
  ruleStatus: "conditional" | "required";
  rationale: string;
  scopeConstraints: Record<string, unknown>;
};

const TR_OFFICIAL_SOURCES = [
  {
    authorityName: "T.C. Mevzuat Bilgi Sistemi",
    sourceUrl: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6502&MevzuatTur=1&MevzuatTertip=5",
    sourceVersion: "6502",
  },
  {
    authorityName: "Kişisel Verileri Koruma Kurumu",
    sourceUrl: "https://www.kvkk.gov.tr/Icerik/6649/6698-Sayili-Kisisel-Verilerin-Korunmasi-Kanunu",
    sourceVersion: "6698",
  },
  {
    authorityName: "T.C. Ulaştırma ve Altyapı Bakanlığı",
    sourceUrl: "https://uhdgm.uab.gov.tr/karayolu-tasima-yonetmeligi",
    sourceVersion: "karayolu-tasima",
  },
] as const;

const TR_CAPABILITY_RULES: readonly CapabilityRuleSeed[] = [
  {
    key: "towing",
    displayName: "Çekici",
    credentialType: "towing_authorization",
    ruleStatus: "required",
    rationale: "Karayolu taşıma faaliyeti ve işletme kapsamı insan incelemesi olmadan doğrulanmış sayılmaz.",
    scopeConstraints: { countryCode: "TR", serviceKeys: ["towing"], requiresVehicleMatch: true },
  },
  {
    key: "courier",
    displayName: "Kurye",
    credentialType: "courier_authorization",
    ruleStatus: "conditional",
    rationale: "Faaliyetin araç, taşıma tipi ve yerel izin kapsamı için karar yalnız makine-okunur constraint ile sınırlanır.",
    scopeConstraints: { countryCode: "TR", serviceKeys: ["courier"], requiresOperatingModel: true },
  },
  {
    key: "roadside",
    displayName: "Yol Yardımı",
    credentialType: "roadside_service_authorization",
    ruleStatus: "conditional",
    rationale: "Riskli saha hizmeti; güvenlik, sigorta ve yetki kapsamı insan incelemesi olmadan genişletilemez.",
    scopeConstraints: { countryCode: "TR", serviceKeys: ["roadside"], requiresInsurance: true },
  },
] as const;

async function findOrCreateJurisdiction(connection: Connection) {
  const [existing] = await connection.execute<any[]>(
    "SELECT id FROM jurisdictions WHERE countryCode = ? AND regionCode IS NULL ORDER BY id ASC LIMIT 1",
    ["TR"],
  );
  if (existing[0]?.id) return Number(existing[0].id);

  await connection.execute(
    "INSERT INTO jurisdictions (countryCode, regionCode, displayName, status) VALUES (?, NULL, ?, 'draft')",
    ["TR", "Türkiye"],
  );
  const [created] = await connection.execute<any[]>(
    "SELECT id FROM jurisdictions WHERE countryCode = ? AND regionCode IS NULL ORDER BY id DESC LIMIT 1",
    ["TR"],
  );
  if (!created[0]?.id) throw new Error("TR_GOLD_MASTER_JURISDICTION_CREATE_FAILED");
  return Number(created[0].id);
}

/** Runs only with a real internal actor id; it never enables a country or payment provider. */
export async function applyTurkeyGoldMasterSeed(connection: Connection, actorUserId: number) {
  if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
    throw new Error("TR_GOLD_MASTER_ACTOR_REQUIRED");
  }

  const jurisdictionId = await findOrCreateJurisdiction(connection);
  const sourceIds: number[] = [];
  for (const source of TR_OFFICIAL_SOURCES) {
    await connection.execute(
      `INSERT INTO official_compliance_sources
        (jurisdictionId, authorityName, sourceUrl, sourceVersion, status, reviewedByUserId, reviewedAt)
       VALUES (?, ?, ?, ?, 'verified', ?, NOW())
       ON DUPLICATE KEY UPDATE sourceVersion=VALUES(sourceVersion), status='verified', reviewedByUserId=VALUES(reviewedByUserId), reviewedAt=NOW()`,
      [jurisdictionId, source.authorityName, source.sourceUrl, source.sourceVersion, actorUserId],
    );
    const [rows] = await connection.execute<any[]>(
      "SELECT id FROM official_compliance_sources WHERE jurisdictionId = ? AND sourceUrl = ? ORDER BY id DESC LIMIT 1",
      [jurisdictionId, source.sourceUrl],
    );
    if (!rows[0]?.id) throw new Error("TR_GOLD_MASTER_SOURCE_LOOKUP_FAILED");
    sourceIds.push(Number(rows[0].id));
  }

  await connection.execute(
    `INSERT INTO jurisdiction_compliance_packages
      (jurisdictionId, version, status, summary, createdByUserId)
     VALUES (?, ?, 'legal_review', ?, ?)
     ON DUPLICATE KEY UPDATE status='legal_review', summary=VALUES(summary)`,
    [
      jurisdictionId,
      TR_GOLD_MASTER_VERSION,
      "Türkiye Gold Master: resmi kaynaklar kaydedildi; hukuki onay, ödeme readiness ve country launch gate tamamlanmadan kullanıma açılamaz.",
      actorUserId,
    ],
  );
  const [packages] = await connection.execute<any[]>(
    "SELECT id FROM jurisdiction_compliance_packages WHERE jurisdictionId = ? AND version = ? LIMIT 1",
    [jurisdictionId, TR_GOLD_MASTER_VERSION],
  );
  const packageId = Number(packages[0]?.id);
  if (!packageId) throw new Error("TR_GOLD_MASTER_PACKAGE_LOOKUP_FAILED");

  for (const rule of TR_CAPABILITY_RULES) {
    await connection.execute(
      `INSERT INTO service_capabilities (\`key\`, displayName, status)
       VALUES (?, ?, 'draft')
       ON DUPLICATE KEY UPDATE displayName=VALUES(displayName)`,
      [rule.key, rule.displayName],
    );
    const [capabilities] = await connection.execute<any[]>(
      "SELECT id FROM service_capabilities WHERE `key` = ? LIMIT 1",
      [rule.key],
    );
    const capabilityId = Number(capabilities[0]?.id);
    if (!capabilityId) throw new Error("TR_GOLD_MASTER_CAPABILITY_LOOKUP_FAILED");

    await connection.execute(
      `INSERT INTO capability_jurisdiction_rules
        (packageId, capabilityId, sourceId, requiredCredentialType, requiresHumanReview, ruleStatus, scopeConstraintsJson, conditionalStatus, rationale)
       VALUES (?, ?, ?, ?, 1, ?, CAST(? AS JSON), 'conditional', ?)
       ON DUPLICATE KEY UPDATE requiredCredentialType=VALUES(requiredCredentialType), requiresHumanReview=1,
         ruleStatus=VALUES(ruleStatus), scopeConstraintsJson=VALUES(scopeConstraintsJson), conditionalStatus='conditional', rationale=VALUES(rationale)`,
      [packageId, capabilityId, sourceIds[0], rule.credentialType, rule.ruleStatus, JSON.stringify(rule.scopeConstraints), rule.rationale],
    );
  }

  return { jurisdictionId, packageId, version: TR_GOLD_MASTER_VERSION, status: "legal_review" as const };
}

export const turkeyGoldMasterSeed = {
  version: TR_GOLD_MASTER_VERSION,
  sources: TR_OFFICIAL_SOURCES,
  rules: TR_CAPABILITY_RULES,
};
