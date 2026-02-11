# Daily Astro - Deployment Guide for VPS

## Requirements

- Docker and Docker Compose
- Domain with SSL (for Telegram webhooks)
- PostgreSQL 16+ (included in docker-compose)

## Quick Start

### 1. Clone and configure

```bash
# Create .env file from example
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:
```
DATABASE_URL=postgresql://postgres:dailyastro123@db:5432/dailyastro
BOT_TOKEN=8411812713:AAFp6FbQ5PNOz0t8P0N8TCQ4zAIgAm5PIvo
NEXT_PUBLIC_APP_URL=https://your-domain.com
ADMIN_PASSWORD=94hepume
BEPAID_SHOP_ID=363
BEPAID_SECRET_KEY=63b6faa98cc31cf70c9b764a3b9bbd423def29ecadff935cf4cce49665d8ed8f
```

### 2. Start with Docker Compose

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f app

# Check database
docker-compose logs db
```

### 3. Initialize Telegram Webhook

After the app is running, visit:
```
https://your-domain.com/api/init
```

This will register the bot webhook with Telegram.

### 4. Setup Cron Jobs (optional)

For automatic daily forecast generation:

```bash
# Edit crontab
crontab -e

# Add line (runs at 00:00 UTC daily):
0 0 * * * curl -s "https://your-domain.com/api/cron/daily" >> /var/log/dailyastro-cron.log 2>&1
```

## Manual Setup (without Docker)

### 1. Install dependencies

```bash
npm install
```

### 2. Setup PostgreSQL

```bash
# Create database
createdb dailyastro

# Run migrations
psql -d dailyastro -f scripts/000-init.sql
```

### 3. Build and run

```bash
# Build
npm run build

# Start
npm run start
```

## Admin Panel

Access at: `https://your-domain.com/admin`

Login with ADMIN_PASSWORD from .env

## URLs

- Landing: `/`
- Subscribe: `/subscribe`
- Forecast: `/forecast`
- Admin: `/admin`
- Webhook (Telegram): `/api/webhooks/telegram`
- Webhook (bePaid): `/api/webhooks/bepaid`
- Init webhook: `/api/init`
- Daily cron: `/api/cron/daily`

## Troubleshooting

### Bot not responding

1. Check webhook status: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
2. Re-initialize: Visit `/api/init`
3. Check app logs: `docker-compose logs app`

### Database connection errors

1. Check if PostgreSQL is running: `docker-compose ps db`
2. Verify DATABASE_URL in .env
3. Check database logs: `docker-compose logs db`

### Payment issues

1. Verify BEPAID_SHOP_ID and BEPAID_SECRET_KEY
2. Check webhook URL is accessible: `https://your-domain.com/api/webhooks/bepaid`
3. Test mode is enabled by default in development

## Nginx Configuration (recommended)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Support

For issues, check the admin panel logs or Docker logs.
