# syntax=docker/dockerfile:1

# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Build-time variables (injected via --build-arg, also exposed at build time)
ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1

# Dummy secrets so `next build` can read env references without real values.
# Override at runtime — these are NOT embedded in the image.
ARG MONGODB_URI=""
ARG JWT_ACCESS_SECRET=""
ARG JWT_REFRESH_SECRET=""
ARG ADMIN_USERNAME=""
ARG ADMIN_PASSWORD=""

ENV NODE_ENV=$NODE_ENV \
    NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED \
    MONGODB_URI=$MONGODB_URI \
    JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET \
    JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET \
    ADMIN_USERNAME=$ADMIN_USERNAME \
    ADMIN_PASSWORD=$ADMIN_PASSWORD

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Compile seed script to JS so it can run without tsx in the runner
RUN npx tsc scripts/seed.ts --outDir scripts/compiled --esModuleInterop --module commonjs --skipLibCheck

# ─── Stage 3: seed ───────────────────────────────────────────────────────────
# One-off image for seeding the admin user. Build with --target seed.
# docker build --target seed -t cluster-dashboard-seed .
# docker run --rm -e MONGODB_URI=... -e ADMIN_USERNAME=... -e ADMIN_PASSWORD=... cluster-dashboard-seed
FROM node:22-alpine AS seed
WORKDIR /app

ENV MONGODB_URI="" \
    ADMIN_USERNAME="" \
    ADMIN_PASSWORD=""

COPY --from=deps /app/node_modules ./node_modules
COPY scripts/ ./scripts/
COPY package.json ./

CMD ["npx", "tsx", "scripts/seed.ts"]

# ─── Stage 4: runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1
ARG PORT=3000
ARG HOSTNAME=0.0.0.0

ENV NODE_ENV=$NODE_ENV \
    NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED \
    PORT=$PORT \
    HOSTNAME=$HOSTNAME

# Runtime secrets — must be supplied via Docker / K8s secrets, not baked in
ENV MONGODB_URI="" \
    JWT_ACCESS_SECRET="" \
    JWT_REFRESH_SECRET="" \
    ADMIN_USERNAME="" \
    ADMIN_PASSWORD=""

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what the server needs at runtime
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy compiled seed script, node_modules it needs, and startup wrapper
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/scripts/compiled/seed.js ./scripts/seed.js
COPY start.sh ./start.sh
RUN chmod +x start.sh

USER nextjs

EXPOSE $PORT

# Seed admin user (if credentials provided) then start server
CMD ["./start.sh"]
