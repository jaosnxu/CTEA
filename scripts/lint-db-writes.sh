#!/usr/bin/env bash
set -euo pipefail

# Allowed directories for direct DB writes:
# - server/repositories: Primary location for DB operations via BaseRepository
# - drizzle/migrations: Database migration scripts (actual location)
# REMOVED: server/services (must use repositories)
# REMOVED: server/db.ts (connection only, no writes)
# REMOVED: server/_core/voiceTranscription.ts (must migrate to repositories)
ALLOW_DIR_REGEX="server/repositories|drizzle/migrations"

# Search for db.* and tx.* write operations outside allowed directories
HITS=$(grep -R --line-number --include="*.ts" --include="*.tsx" -E "(db|tx)\.(update|insert|delete)\(" server \
  | grep -Ev "$ALLOW_DIR_REGEX" || true)

if [[ -n "$HITS" ]]; then
  echo "❌ Direct db/tx write found outside repositories/migrations/services:"
  echo "$HITS"
  echo ""
  echo "Fix: Move writes into repository methods or use transactions in services."
  echo "See CONTRIBUTING.md for guidelines."
  exit 1
fi

echo "✅ No direct db/tx writes outside allowed directories."
