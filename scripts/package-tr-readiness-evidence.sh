#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/exports"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/TR_LEGAL_SOURCE_COUNSEL_REVIEW_PACKAGE" "$STAGE/TR_READINESS_EVIDENCE_PACKAGE"
cp "$OUT/TR_SERVICE_CREDENTIAL_MATRIX.xlsx" "$OUT/TR_LEGAL_SOURCE_COUNSEL_REVIEW_TEMPLATE.xlsx" "$STAGE/TR_LEGAL_SOURCE_COUNSEL_REVIEW_PACKAGE/"
cp "$ROOT/docs/compliance/TR_PUBLIC_SOURCE_RETRIEVAL_NOTES.md" "$ROOT/docs/compliance/tr-production-evidence/TR_OFFICIAL_SOURCE_REGISTER.csv" "$STAGE/TR_LEGAL_SOURCE_COUNSEL_REVIEW_PACKAGE/"
cp "$ROOT/server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Gold_Master_Country_Pack_v1.json" "$ROOT/server/compliance/approved-sources/TR-GOLD-2026-08-13-v1.0/TR_Official_Source_Registry_v1.json" "$STAGE/TR_LEGAL_SOURCE_COUNSEL_REVIEW_PACKAGE/"
cp -R "$STAGE/TR_LEGAL_SOURCE_COUNSEL_REVIEW_PACKAGE/." "$STAGE/TR_READINESS_EVIDENCE_PACKAGE/"
cp "$OUT/TR_CONNECTOR_AND_EXTERNAL_INPUT_REGISTER.xlsx" "$OUT/TR_PRODUCTION_ALLOWLIST_AND_NOGO.xlsx" "$ROOT/docs/compliance/TR_ONLY_PRODUCTION_READINESS_MATRIX.md" "$ROOT/docs/compliance/TR_PRODUCTION_READINESS_FINAL_REPORT.md" "$ROOT/docs/compliance/TR_PHYSICAL_DEVICE_E2E_RESULTS.txt" "$STAGE/TR_READINESS_EVIDENCE_PACKAGE/"
for d in TR_LEGAL_SOURCE_COUNSEL_REVIEW_PACKAGE TR_READINESS_EVIDENCE_PACKAGE; do
  (cd "$STAGE/$d" && find . -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt)
  (cd "$STAGE" && zip -qr "$OUT/$d.zip" "$d")
  sha256sum "$OUT/$d.zip" > "$OUT/$d.zip.sha256"
done
