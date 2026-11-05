#!/bin/bash
set -e

echo "=== Initializing PostgreSQL Database: $POSTGRES_DB ==="

# 1. Execute all .up.sql migrations in numerical order
for f in /migrations/*.up.sql; do
    echo "Applying migration: $f"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
done

# 2. Execute system baseline seed
echo "Applying system seed: /seeds/system_seed.sql"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /seeds/system_seed.sql

# 3. Conditionally execute demo seed if in development mode
if [ "$LOAD_DEMO_SEED" = "true" ] || [ "$ENV" = "development" ]; then
    echo "Applying demo seed (development mode active): /seeds/demo_seed.sql"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /seeds/demo_seed.sql
fi

echo "=== PostgreSQL Database Initialization Completed Successfully ==="
