#!/usr/bin/env bash
set -u

NODE_OPTIONS=--max-old-space-size="${NODE_HEAP_MB:-512}" pnpm exec tsc --noEmit --skipLibCheck &
root_pid=$!
max_rss_kb=0

descendants() {
  local parent_pid="$1"
  local child_pid
  for child_pid in $(pgrep -P "$parent_pid" 2>/dev/null || true); do
    printf '%s\n' "$child_pid"
    descendants "$child_pid"
  done
}

while kill -0 "$root_pid" 2>/dev/null; do
  pids="$root_pid $(descendants "$root_pid")"
  for pid in $pids; do
    rss_kb=$(ps -o rss= -p "$pid" 2>/dev/null | tr -d ' ' || true)
    if [[ "$rss_kb" =~ ^[0-9]+$ ]] && (( rss_kb > max_rss_kb )); then
      max_rss_kb=$rss_kb
    fi
  done
  sleep 0.05
done

wait "$root_pid"
status=$?
printf 'tsc_heap_mb=%s\npeak_observed_process_rss_kb=%s\nexit_status=%s\n' "${NODE_HEAP_MB:-512}" "$max_rss_kb" "$status"
exit "$status"
