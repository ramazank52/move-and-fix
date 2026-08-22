#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINE="70645d3c"
STAMP="2026-08-22"
PACKAGE_NAME="DE_BERLIN_CHECKPOINT_A_REVIEW_PACKAGE"
PACKAGE_ROOT="$ROOT_DIR/exports/$PACKAGE_NAME"
ZIP_PATH="$ROOT_DIR/exports/$PACKAGE_NAME.zip"
OUTER_MANIFEST_PATH="$ROOT_DIR/exports/${PACKAGE_NAME}_OUTER_ARTIFACT_MANIFEST.tsv"

rm -rf "$PACKAGE_ROOT" "$ZIP_PATH" "${ZIP_PATH}.sha256" "$OUTER_MANIFEST_PATH"
mkdir -p \
  "$PACKAGE_ROOT/evidence" \
  "$PACKAGE_ROOT/source/drizzle/meta" \
  "$PACKAGE_ROOT/source/server/compliance" \
  "$PACKAGE_ROOT/source/tests" \
  "$PACKAGE_ROOT/source/scripts" \
  "$PACKAGE_ROOT/reports"

cp "$ROOT_DIR/docs/compliance/checkpoint-a-evidence/"* "$PACKAGE_ROOT/evidence/"
cp "$ROOT_DIR/docs/compliance/FAZ0_FIVE_COUNTRY_AUDIT.md" "$PACKAGE_ROOT/reports/"
cp "$ROOT_DIR/docs/compliance/DE_BERLIN_CHECKPOINT_A_MATRIX.md" "$PACKAGE_ROOT/reports/"
cp "$ROOT_DIR/docs/compliance/CHECKPOINT_A_GERMANY_BERLIN_REPORT.md" "$PACKAGE_ROOT/reports/"
cp "$ROOT_DIR/drizzle/0085_global_country_scaffold.sql" "$PACKAGE_ROOT/source/drizzle/"
cp "$ROOT_DIR/drizzle/0086_global_country_capability_binding_berlin_scaffold.sql" "$PACKAGE_ROOT/source/drizzle/"
cp "$ROOT_DIR/drizzle/schema.ts" "$PACKAGE_ROOT/source/drizzle/"
cp "$ROOT_DIR/drizzle/meta/_journal.json" "$PACKAGE_ROOT/source/drizzle/meta/"
cp "$ROOT_DIR/server/compliance/CountryDeploymentPolicy.ts" "$PACKAGE_ROOT/source/server/compliance/"
cp "$ROOT_DIR/server/compliance/CountryComplianceRepository.ts" "$PACKAGE_ROOT/source/server/compliance/"
cp "$ROOT_DIR/vitest.config.ts" "$PACKAGE_ROOT/source/"
cp "$ROOT_DIR/tsconfig.json" "$PACKAGE_ROOT/source/"
cp "$ROOT_DIR/tests/country-deployment-policy.test.ts" "$PACKAGE_ROOT/source/tests/"
cp "$ROOT_DIR/tests/global-country-scaffold-contract.test.ts" "$PACKAGE_ROOT/source/tests/"
cp "$ROOT_DIR/tests/country-launch-gate-contract.test.ts" "$PACKAGE_ROOT/source/tests/"
cp "$ROOT_DIR/tests/faz8a-capability-profile.test.ts" "$PACKAGE_ROOT/source/tests/"
cp "$ROOT_DIR/scripts/export-checkpoint-a-catalog-snapshot.ts" "$PACKAGE_ROOT/source/scripts/"
cp "$ROOT_DIR/scripts/build-checkpoint-a-review-artifacts.ts" "$PACKAGE_ROOT/source/scripts/"
cp "$ROOT_DIR/scripts/measure-tsc-memory.sh" "$PACKAGE_ROOT/source/scripts/"
cp "$ROOT_DIR/scripts/package-checkpoint-a-review.sh" "$PACKAGE_ROOT/source/scripts/"

git -C "$ROOT_DIR" diff --binary "$BASELINE" -- > "$PACKAGE_ROOT/CHECKPOINT_A_CHANGESET.patch"
git -C "$ROOT_DIR" rev-parse "$BASELINE^{commit}" > "$PACKAGE_ROOT/BASELINE_FULL_GIT_SHA.txt"
git -C "$ROOT_DIR" status --short > "$PACKAGE_ROOT/WORKTREE_STATUS_AT_EXPORT.txt"

cat > "$PACKAGE_ROOT/README.md" <<'EOF'
# Move&Fix — CHECKPOINT A Berlin İnceleme Paketi

Bu paket Germany/Berlin CHECKPOINT A için salt-okunur inceleme materyalidir.
Paket hiçbir production aktivasyonu, legal approval, source verification, connector authorization veya product release approval üretmez.

## Güvenlik Durumu

| Alan | Durum |
|---|---|
| Berlin capability policy | 79/79 `BLOCKED` |
| Germany country state | `SCAFFOLD_ONLY` |
| Resmî kaynak | 10/10 `SOURCE_UNVERIFIED` |
| Connector | 4/4 `PENDING`, assurance `NONE` |
| Legal locale | 6/6 `DRAFT_MACHINE`, runtime selectable `false` |
| Türkiye Blok 1 | Korundu, SOURCE_UNVERIFIED / NO-GO |
| Production publish / activation | Yapılmadı |

## Ana Giriş Noktaları

1. `evidence/DE_BERLIN_LIVE_CATALOG_SNAPSHOT.json`: 16 hizmet, 62 alt hizmet, 46 alias ve 79 capability canlı snapshot.
2. `evidence/DE_BERLIN_SERVICE_CREDENTIAL_MATRIX.csv`: 79 satırlık UNKNOWN=BLOCK matrix.
3. `evidence/DE_BERLIN_OFFICIAL_SOURCE_REGISTER.csv`: SOURCE_UNVERIFIED kaynak registry.
4. `evidence/DE_BERLIN_LEGAL_REVIEW_TEMPLATE.csv`: hukukçu doldurması için boş review alanları.
5. `reports/CHECKPOINT_A_GERMANY_BERLIN_REPORT.md`: outcome, NO-GO, rollback, quality gate ve pending listesi.
6. `CHECKPOINT_A_CHANGESET.patch`: `70645d3c` baseline’dan bu çalışma ağacına birleşik diff.
7. `evidence/DE_BERLIN_SCOPE_SEPARATION_GUARDS.md`: Otomatik Meisterbrief, utility-zone, freight/courier, towing/repair, cleaning ve carpentry kapsam eşleştirmelerini engelleyen negatif guard’lar.
8. `evidence/DE_BERLIN_AUTHORIZATION_BOUNDARY_EVIDENCE.md`: Provider state-write engelleri, RLS teknoloji sınırı, Türkiye izolasyonu ve hedefli negatif test kanıtı.

Raw CSV/JSON dosyaları yalnız supporting evidence’tır. Karar ve özet için Markdown raporları esas alınmalıdır. `source/tests/` kopyaları bağımsız çalıştırılabilir proje değildir; audit kanıtıdır. Ana proje Vitest kapsamı yalnız gerçek `tests/**/*.{test,spec}.{ts,tsx}` dosyalarıyla açıkça sınırlandırılmıştır.
EOF

cat > "$PACKAGE_ROOT/EXCLUSION_LIST.txt" <<'EOF'
Bu paket bilinçli olarak aşağıdakileri içermez:
- .env, .env.*, secret, API key, token, private key, certificate, credential
- node_modules, build cache, .expo, dist ve coverage çıktıları
- kullanıcı veya sağlayıcı kişisel verisi, belge binary’si ve medya
- production database dump, bağlantı dizesi veya oturum çerezi
- resmi kaynak arşiv kopyası; bu paketteki kaynak kayıtları SOURCE_UNVERIFIED discovery referanslarıdır
- otomatik activation, connector çağrısı, scraping veya yayın işlemi
EOF

cat > "$PACKAGE_ROOT/AUDIT_ATTESTATION.txt" <<EOF
package_name=$PACKAGE_NAME
package_date=$STAMP
baseline_short_sha=$BASELINE
baseline_full_sha=$(git -C "$ROOT_DIR" rev-parse "$BASELINE^{commit}")
country_checkpoint=CHECKPOINT_A
production_publish=false
production_activation=false
germany_country_state=SCAFFOLD_ONLY
berlin_capability_decisions=79_BLOCKED
berlin_source_status=10_SOURCE_UNVERIFIED
berlin_connectors=4_PENDING_ASSURANCE_NONE
berlin_legal_locales=6_DRAFT_MACHINE_RUNTIME_FALSE
turkey_block1_modified=false
full_regression=125_files_732_tests_PASS
lint=PASS
typescript_512mb=BLOCKED_NODE_HEAP_OOM_peak_rss_612416_KiB
typescript_1792mb=PASS
backend_build=PASS
drizzle_check=PASS
sca_gate=PASS
whitespace_check=PASS
environment_separation=UNVERIFIED
EOF

(
  cd "$PACKAGE_ROOT"
  find . -type f ! -name 'PACKAGE_MANIFEST.tsv' -print0 \
    | LC_ALL=C sort -z \
    | while IFS= read -r -d '' file; do
        digest=$(sha256sum "$file" | awk '{print $1}')
        bytes=$(wc -c < "$file" | tr -d ' ')
        printf '%s\t%s\t%s\n' "$digest" "$bytes" "${file#./}"
      done > PACKAGE_MANIFEST.tsv
)

(
  cd "$ROOT_DIR/exports"
  zip -qr "$(basename "$ZIP_PATH")" "$(basename "$PACKAGE_ROOT")"
)
sha256sum "$ZIP_PATH" > "${ZIP_PATH}.sha256"

# Requested outer deliverables are byte-identical copies of their in-package
# evidence files. Their hashes are published separately so review can verify
# both the ZIP member and the external file without trusting a filename.
DELIVERY_FILES=(
  "DE_BERLIN_SERVICE_CREDENTIAL_MATRIX.csv"
  "DE_BERLIN_SERVICE_CREDENTIAL_MATRIX.json"
  "DE_BERLIN_OFFICIAL_SOURCE_REGISTER.csv"
  "DE_BERLIN_CONNECTOR_GAP_REPORT.md"
  "DE_BERLIN_LEGAL_REVIEW_TEMPLATE.csv"
  "DE_BERLIN_CHANGESET_AND_TEST_EVIDENCE.md"
)
for artifact in "${DELIVERY_FILES[@]}"; do
  cp "$PACKAGE_ROOT/evidence/$artifact" "$ROOT_DIR/exports/$artifact"
done
(
  for artifact in "${DELIVERY_FILES[@]}"; do
    path="$ROOT_DIR/exports/$artifact"
    digest=$(sha256sum "$path" | awk '{print $1}')
    bytes=$(wc -c < "$path" | tr -d ' ')
    printf '%s\t%s\t%s\n' "$digest" "$bytes" "$artifact"
  done
  digest=$(sha256sum "$ZIP_PATH" | awk '{print $1}')
  bytes=$(wc -c < "$ZIP_PATH" | tr -d ' ')
  printf '%s\t%s\t%s\n' "$digest" "$bytes" "$(basename "$ZIP_PATH")"
) > "$OUTER_MANIFEST_PATH"
printf 'package_root=%s\nzip_path=%s\nouter_manifest=%s\n' "$PACKAGE_ROOT" "$ZIP_PATH" "$OUTER_MANIFEST_PATH"
