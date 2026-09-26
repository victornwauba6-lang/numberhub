#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not configured"
  exit 1
fi

EXISTS="$(psql "$DATABASE_URL" -tAc "SELECT to_regclass('public.manual_funding_requests') IS NOT NULL;")"

if [ "$EXISTS" = "t" ]; then
  echo "manual_funding_requests already exists; nothing to do."
else
  echo "Creating manual_funding_requests..."
  psql "$DATABASE_URL" -f src/db/migrations/0011_manual_funding.sql
  echo "manual_funding_requests created successfully."
fi
