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

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
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

USER nextjs

EXPOSE $PORT

# next start in standalone mode
CMD ["node", "server.js"]
