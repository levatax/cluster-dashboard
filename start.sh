#!/bin/sh
set -e

# Seed admin user if credentials are provided
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ] && [ -n "$MONGODB_URI" ]; then
  echo "Seeding admin user..."
  node scripts/seed.js || echo "Seed failed — continuing startup"
fi

exec node server.js
