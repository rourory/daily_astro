# Stage 1: Зависимости
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# Копируем схему prisma
COPY prisma ./prisma/

RUN npm config set fetch-retry-maxtimeout 600000 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retries 5

RUN npm ci

# Stage 2: Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Генерируем prisma client
RUN npx prisma generate
RUN npm install sharp
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем статику и standalone сборку
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Запуск: миграция схемы -> старт сервера
CMD npx prisma@6.19.2 db push && node server.js
