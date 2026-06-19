#!/bin/sh
set -eu

path="${1:-}"

if [ -z "$path" ]; then
  echo "Usage: sh scripts/railway-cron.sh /api/cron/<job>" >&2
  exit 64
fi

if [ -z "${NEXT_PUBLIC_WEBAPP_URL:-}" ]; then
  echo "NEXT_PUBLIC_WEBAPP_URL is required" >&2
  exit 64
fi

authorization="${CRON_SECRET:-}"

if [ -n "$authorization" ]; then
  authorization="Bearer $authorization"
elif [ -n "${CRON_API_KEY:-}" ]; then
  authorization="$CRON_API_KEY"
else
  echo "CRON_SECRET or CRON_API_KEY is required" >&2
  exit 64
fi

url="${NEXT_PUBLIC_WEBAPP_URL%/}$path"

wget --quiet --output-document=- --header="Authorization: $authorization" "$url"
