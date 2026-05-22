#!/bin/sh
set -e

# Run Prisma schema push to ensure database schema is up-to-date and SQLite dev.db is initialized
echo "[DOCKER-ENTRYPOINT] Running Prisma database schema push..."
npx prisma db push --accept-data-loss

# Start the application server
echo "[DOCKER-ENTRYPOINT] Starting AnnASystems server..."
exec "$@"
