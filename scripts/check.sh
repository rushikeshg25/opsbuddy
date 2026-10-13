#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for module in http ping-service log-ingestion-service log-consumer-service notification-service sdk/go; do
  (cd "$module" && go test ./...)
done
(cd ping-service && go test -race ./...)
(cd sdk/node && bun test index.test.ts && bun run type-check && bun run build)
(cd ui && bun test tests && bunx tsc --noEmit && bun run build)
