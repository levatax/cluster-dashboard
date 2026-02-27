# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Start production**: `npm start`
- **Seed admin user**: `npm run seed` (requires `MONGODB_URI`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` env vars)

No test framework is configured yet.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in real values:
- `MONGODB_URI` — MongoDB connection string
- `JWT_ACCESS_SECRET` — 64-char hex secret for access tokens
- `JWT_REFRESH_SECRET` — 64-char hex secret for refresh tokens
- `ADMIN_USERNAME` — Admin login username (for seed script)
- `ADMIN_PASSWORD` — Admin login password (for seed script)

## Architecture

Kubernetes cluster management dashboard built with Next.js 16, React 19, and TypeScript. Uses MongoDB (Mongoose) for data storage and JWT authentication (single admin user).

### Data Flow

1. **Database (MongoDB)** stores cluster configs, deployments, templates, and auth data. Connection singleton in `src/lib/mongodb.ts` cached on `globalThis`. Mongoose models in `src/lib/models/`. All CRUD functions in `src/lib/db.ts` are async.
2. **Kubernetes operations** in `src/lib/kubernetes.ts` use `@kubernetes/client-node` to connect to clusters and fetch info (version, nodes, connection status).
3. **Server actions** in `src/app/actions/` wrap database and k8s operations. They return typed results `{ success: true; data: T } | { success: false; error: string }` and call `revalidatePath()` for cache invalidation.
4. **Pages** are server components that call server actions/db directly. Interactive parts are `"use client"` components.
5. **Authentication** uses JWT with access tokens (15min, HTTP-only cookies) and refresh tokens (7 days, rotation with reuse detection). Middleware (`src/middleware.ts`) protects all routes except `/login` and `/api/auth/refresh`. Auth utilities in `src/lib/auth.ts` (Node.js) and `src/lib/auth-edge.ts` (Edge runtime).

### Key Directories

- `src/app/(dashboard)/` — Protected dashboard pages (route group)
- `src/app/login/` — Login page (public)
- `src/app/actions/` — Server actions: `clusters.ts` (CRUD), `kubernetes.ts` (k8s API calls), `auth.ts` (login/logout)
- `src/app/(dashboard)/clusters/[id]/` — Cluster detail page with loading/error/not-found states
- `src/components/ui/` — shadcn/ui components (New York style, lucide icons)
- `src/components/` — Feature components: `cluster-card`, `cluster-overview`, `node-table`, `import-dialog`, `sidebar`
- `src/lib/db.ts` — MongoDB CRUD operations (async, all entity IDs are strings/ObjectIds)
- `src/lib/models/` — Mongoose schemas (cluster, alert-config, app-install, github-deployment, deployment-history, deployment-template, dockerhub-deployment, user, refresh-token)
- `src/lib/mongodb.ts` — MongoDB connection singleton
- `src/lib/auth.ts` — Auth utilities (password hashing, JWT, session, rate limiting)
- `src/lib/kubernetes.ts` — Kubernetes client wrapper functions

### Routes

- `/` — Cluster list (home, protected)
- `/clusters/[id]` — Cluster detail with Overview and Nodes tabs (protected)
- `/login` — Login page (public)
- `/api/auth/refresh` — Token refresh endpoint (public)

### ID Convention

All entity IDs are MongoDB ObjectId strings (not integers). Components and server actions use `string` type for all IDs (`clusterId`, `id`, `installId`, `deploymentId`).

## Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Commit format**: `<type>: <description>` where type is feat/fix/docs/style/refactor/test/chore
- **shadcn/ui config**: New York style, RSC enabled, CSS variables, components in `@/components/ui`
- **Animations**: Use `motion` library (Framer Motion successor) via wrapper components in `motion-primitives.tsx`
- **Styling**: Tailwind CSS v4 with OKLch color space and custom CSS variables defined in `globals.css`
- **next.config.ts**: `serverExternalPackages: ["mongoose", "@node-rs/argon2"]` required for MongoDB and auth