#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-/home/ubuntu/movefix-final-export}"
VERIFY_DIR="${2:-/home/ubuntu/movefix-final-export-verify}"
ARCHIVE="$OUT_DIR/MOVEFIX_COMPLETE_SOURCE_FINAL.zip"

cd "$ROOT"
rm -rf "$OUT_DIR" "$VERIFY_DIR"
mkdir -p "$OUT_DIR" "$VERIFY_DIR"

git diff --quiet
git diff --cached --quiet

if git ls-files | grep -E '(^|/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|id_rsa$|id_ed25519$|node_modules/|dist/|coverage/|\.expo/)' >/dev/null; then
  echo "Tracked sensitive or generated path detected; export aborted." >&2
  exit 1
fi

git archive --format=zip --prefix=move-and-fix/ HEAD > "$ARCHIVE"
unzip -t "$ARCHIVE" >/dev/null
unzip -q "$ARCHIVE" -d "$VERIFY_DIR"

if zipinfo -1 "$ARCHIVE" | grep -E '(^|/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|id_rsa$|id_ed25519$|node_modules/|dist/|coverage/|\.expo/)' >/dev/null; then
  echo "Excluded path found in archive; export aborted." >&2
  exit 1
fi

(
  cd "$VERIFY_DIR/move-and-fix"
  find . -type f -print0 | sort -z | while IFS= read -r -d '' path; do
    digest="$(sha256sum "$path" | awk '{print $1}')"
    bytes="$(stat -c '%s' "$path")"
    printf '%s\t%s\t%s\n' "$digest" "$bytes" "${path#./}"
  done
) > "$OUT_DIR/FILE_MANIFEST.txt"

cat > "$OUT_DIR/EXCLUSION_LIST.txt" <<'EOF'
Archive source: tracked Git HEAD only.
Excluded by Git tracking and explicit archive validation:
- .env and .env.*
- private keys, certificates and credential containers (*.pem, *.key, *.p12, *.pfx, id_rsa, id_ed25519)
- node_modules, dist, coverage, .expo and generated caches
- untracked local files, temporary artifacts and runtime logs
EOF

(
  cd "$OUT_DIR"
  sha256sum MOVEFIX_COMPLETE_SOURCE_FINAL.zip FILE_MANIFEST.txt EXCLUSION_LIST.txt > SHA256SUMS.txt
)

printf 'ARCHIVE_OK\nHEAD=%s\nFILES=%s\n' "$(git rev-parse HEAD)" "$(wc -l < "$OUT_DIR/FILE_MANIFEST.txt")" > "$OUT_DIR/EXPORT_VALIDATION.txt"
