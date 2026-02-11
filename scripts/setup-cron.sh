#!/bin/bash

# Setup cron job for daily forecast generation and delivery
# Run this script on your VPS after deployment

# Get the app URL from environment or use default
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-}"

echo "Setting up cron job for Daily Astro..."

# Create cron job file
CRON_FILE="/etc/cron.d/dailyastro"

# Daily forecast generation at 00:00 UTC
# Delivery to users at 07:30 Minsk time (04:30 UTC in winter, 03:30 UTC in summer)

if [ -n "$CRON_SECRET" ]; then
  AUTH_HEADER="Authorization: Bearer $CRON_SECRET"
else
  AUTH_HEADER=""
fi

cat > $CRON_FILE << EOF
# Daily Astro Cron Jobs
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Generate forecasts at 00:00 UTC daily
0 0 * * * root curl -s -H "$AUTH_HEADER" "$APP_URL/api/cron/daily" > /var/log/dailyastro-cron.log 2>&1

# Additional delivery run at 04:30 UTC (07:30 Minsk winter time)
30 4 * * * root curl -s -H "$AUTH_HEADER" "$APP_URL/api/cron/daily" >> /var/log/dailyastro-cron.log 2>&1
EOF

chmod 644 $CRON_FILE

echo "Cron job created at $CRON_FILE"
echo "Forecast generation will run at 00:00 UTC and 04:30 UTC daily"
echo ""
echo "To view logs: tail -f /var/log/dailyastro-cron.log"
echo "To test manually: curl -H '$AUTH_HEADER' '$APP_URL/api/cron/daily'"
