FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Set dummy DATABASE_URL for build time only (real one is injected by Railway at runtime)
ENV DATABASE_URL=file:/tmp/build-dummy.db
ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate is now embedded in the build script (package.json)
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Prisma schema and engine
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# We need to create the data volume directory
RUN mkdir -p /app/.cluco_data && chown -R nextjs:nodejs /app/.cluco_data

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Note: Railway handles running the start script via package.json usually, 
# but for Docker we run the standalone server.
# We must push the database schema to the persistent volume before starting.
CMD npx prisma db push --skip-generate && node server.js
