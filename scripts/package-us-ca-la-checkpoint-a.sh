#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXPORTS="$ROOT/exports"
STAGE="$EXPORTS/.us-ca-la-checkpoint-a-stage"
ZIP="$EXPORTS/US_CA_LA_CHECKPOINT_A_REVIEW_PACKAGE.zip"
MANIFEST="$EXPORTS/US_CA_LA_CHECKPOINT_A_REVIEW_PACKAGE_MANIFEST.tsv"
HASH="$EXPORTS/US_CA_LA_CHECKPOINT_A_REVIEW_PACKAGE_SHA256.txt"

rm -rf "$STAGE" "$ZIP" "$MANIFEST" "$HASH"
mkdir -p "$STAGE" "$EXPORTS"

files=(
  "docs/compliance/FAZ0_US_CA_LA_V2_AUDIT.md"
  "docs/compliance/US_CA_LA_CHECKPOINT_A_REPORT.md"
  "docs/compliance/US_CA_LA_V2_AUTHORIZATION_BOUNDARY.md"
  "docs/compliance/us-ca-la-v2-research-reconciliation.json"
  "docs/compliance/us-ca-la-v2-evidence/US_CA_LA_COVERAGE_MATRIX.csv"
  "docs/compliance/us-ca-la-v2-evidence/US_CA_LA_SOURCE_REGISTRY.txt"
  "docs/compliance/us-ca-la-v2-evidence/US_CA_LA_CONNECTOR_REGISTRY.txt"
  "docs/compliance/us-ca-la-v2-evidence/US_CA_LA_LOCALE_REGISTRY.txt"
  "docs/compliance/us-ca-la-v2-evidence/US_CA_LA_EVIDENCE_SUMMARY.json"
  "drizzle/0087_us_ca_la_v2_default_off.sql"
  "drizzle/0088_us_ca_la_v2_credential_shells.sql"
  "drizzle/schema.ts"
  "drizzle/meta/_journal.json"
  "server/compliance/CountryDeploymentPolicy.ts"
  "server/compliance/CountryComplianceRepository.ts"
  "scripts/reconcile-us-ca-la-v2-research.ts"
  "scripts/export-us-ca-la-checkpoint-a-evidence.ts"
  "scripts/apply-manual-migration.ts"
  "tests/us-ca-la-v2-policy.test.ts"
  "tests/us-ca-la-v2-authorization.test.ts"
  "todo.md"
)

for file in "${files[@]}"; do
  test -f "$ROOT/$file"
  mkdir -p "$STAGE/$(dirname "$file")"
  cp "$ROOT/$file" "$STAGE/$file"
done

(
  cd "$STAGE"
  find . -type f -print0 | sort -z | while IFS= read -r -d '' file; do
    rel="${file#./}"
    bytes="$(wc -c < "$file" | tr -d ' ')"
    digest="$(sha256sum "$file" | awk '{print $1}')"
    printf '%s\t%s\t%s\n' "$digest" "$bytes" "$rel"
  done > "$MANIFEST"
  cp "$MANIFEST" "US_CA_LA_CHECKPOINT_A_REVIEW_PACKAGE_MANIFEST.tsv"
  zip -qr "$ZIP" . -x 'US_CA_LA_CHECKPOINT_A_REVIEW_PACKAGE_MANIFEST.tsv'
)

sha256sum "$ZIP" > "$HASH"
unzip -t "$ZIP" >/dev/null
rm -rf "$STAGE"
printf 'ZIP=%s\nMANIFEST=%s\nSHA256=%s\n' "$ZIP" "$MANIFEST" "$(cut -d' ' -f1 "$HASH")"
