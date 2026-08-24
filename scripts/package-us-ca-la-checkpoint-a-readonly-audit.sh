#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPORTS="$ROOT/exports"
AUDIT="$EXPORTS/us-ca-la-checkpoint-a-audit"
STAGE="$EXPORTS/.us-ca-la-readonly-audit-stage"
ZIP="$EXPORTS/US_CA_LA_CHECKPOINT_A_REVIEW.zip"
HASH="$EXPORTS/US_CA_LA_CHECKPOINT_A_REVIEW_HASH.txt"
MANIFEST="$EXPORTS/US_CA_LA_CHECKPOINT_A_REVIEW_MANIFEST.tsv"
FULL_TEST="/home/ubuntu/terminal_full_output/2026-08-23_23-28-40_562617_748.txt"

required=(
  "$AUDIT/US_CA_LA_AUDIT.json"
  "$AUDIT/US_CA_LA_SERVICE_CREDENTIAL_MATRIX.csv"
  "$AUDIT/US_CA_LA_SOURCE_REGISTER.csv"
  "$AUDIT/US_CA_LA_REQUIREMENT_BUNDLE_MANIFEST.json"
  "$AUDIT/US_CA_LA_CONNECTOR_INVENTORY.json"
  "$AUDIT/US_CA_LA_LOCALE_REGISTER.json"
  "$AUDIT/US_CA_LA_PROVIDER_IMPACT.json"
  "$AUDIT/US_CA_LA_CONSTRAINTS.json"
  "$EXPORTS/US_CA_LA_SERVICE_CREDENTIAL_MATRIX.xlsx"
  "$EXPORTS/US_CA_LA_SOURCE_REGISTER.xlsx"
  "$EXPORTS/US_CA_LA_LEGAL_REVIEW_TEMPLATE.xlsx"
  "$EXPORTS/US_CA_LA_CONNECTOR_GAP_REPORT.md"
  "$FULL_TEST"
)
for file in "${required[@]}"; do test -f "$file"; done

rm -rf "$STAGE" "$ZIP" "$HASH" "$MANIFEST"
mkdir -p "$STAGE/evidence" "$STAGE/migrations" "$STAGE/runtime" "$STAGE/tests" "$STAGE/quality" "$STAGE/docs"

cp "$EXPORTS/US_CA_LA_SERVICE_CREDENTIAL_MATRIX.xlsx" "$STAGE/US_CA_LA_SERVICE_CREDENTIAL_MATRIX.xlsx"
cp "$EXPORTS/US_CA_LA_SOURCE_REGISTER.xlsx" "$STAGE/US_CA_LA_SOURCE_REGISTER.xlsx"
cp "$EXPORTS/US_CA_LA_LEGAL_REVIEW_TEMPLATE.xlsx" "$STAGE/US_CA_LA_LEGAL_REVIEW_TEMPLATE.xlsx"
cp "$EXPORTS/US_CA_LA_CONNECTOR_GAP_REPORT.md" "$STAGE/US_CA_LA_CONNECTOR_GAP_REPORT.md"
cp "$AUDIT/US_CA_LA_SERVICE_CREDENTIAL_MATRIX.csv" "$STAGE/US_CA_LA_SERVICE_CREDENTIAL_MATRIX.csv"
cp "$AUDIT/US_CA_LA_SOURCE_REGISTER.csv" "$STAGE/US_CA_LA_SOURCE_REGISTER.csv"
cp "$AUDIT"/US_CA_LA_{AUDIT,REQUIREMENT_BUNDLE_MANIFEST,CONNECTOR_INVENTORY,LOCALE_REGISTER,PROVIDER_IMPACT,CONSTRAINTS,AUDIT_ARTIFACT_MANIFEST}.json "$STAGE/evidence/"
cp "$ROOT/docs/compliance/US_CA_LA_CHECKPOINT_A_REPORT.md" "$STAGE/US_CA_LA_CHECKPOINT_A_REPORT.md"
cp "$ROOT/docs/compliance/US_CA_LA_CHANGE_AND_TEST_EVIDENCE.txt" "$STAGE/US_CA_LA_CHANGE_AND_TEST_EVIDENCE.txt"
cp "$ROOT/docs/compliance/US_CA_LA_SOURCE_ARCHIVE_LIMITATIONS.md" "$STAGE/docs/"
cp "$ROOT/docs/compliance/US_CA_LA_NO_GO_EXCEPTION_ANALYSIS.md" "$STAGE/docs/"
cp "$ROOT/docs/compliance/US_CA_LA_PRODUCTION_ALLOWLIST.md" "$STAGE/docs/"
cp "$ROOT/docs/compliance/US_CA_LA_V2_AUTHORIZATION_BOUNDARY.md" "$STAGE/docs/"
cp "$ROOT/drizzle/0087_us_ca_la_v2_default_off.sql" "$STAGE/migrations/"
cp "$ROOT/drizzle/0088_us_ca_la_v2_credential_shells.sql" "$STAGE/migrations/"
cp "$ROOT/drizzle/meta/_journal.json" "$STAGE/migrations/"
cp "$ROOT/drizzle/schema.ts" "$STAGE/migrations/"
cp "$ROOT/server/compliance/CountryDeploymentPolicy.ts" "$STAGE/runtime/"
cp "$ROOT/server/compliance/CountryComplianceRepository.ts" "$STAGE/runtime/"
cp "$ROOT/tests/us-ca-la-v2-policy.test.ts" "$STAGE/tests/"
cp "$ROOT/tests/us-ca-la-v2-authorization.test.ts" "$STAGE/tests/"
cp "$FULL_TEST" "$STAGE/quality/US_CA_LA_FULL_TEST_OUTPUT.txt"

(
  cd "$STAGE"
  find . -type f -print0 | sort -z | while IFS= read -r -d '' file; do
    relative="${file#./}"
    bytes="$(wc -c < "$file" | tr -d ' ')"
    digest="$(sha256sum "$file" | awk '{print $1}')"
    printf '%s\t%s\t%s\n' "$digest" "$bytes" "$relative"
  done > "$MANIFEST"
  cp "$MANIFEST" "US_CA_LA_CHECKPOINT_A_REVIEW_MANIFEST.tsv"
  zip -qr "$ZIP" . -x 'US_CA_LA_CHECKPOINT_A_REVIEW_MANIFEST.tsv'
)

sha256sum "$ZIP" > "$HASH"
unzip -t "$ZIP" >/dev/null
rm -rf "$STAGE"
printf 'ZIP=%s\nSHA256=%s\nMANIFEST=%s\n' "$ZIP" "$(cut -d' ' -f1 "$HASH")" "$MANIFEST"
