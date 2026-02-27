# Cluster Dashboard

A self-hosted Kubernetes cluster management dashboard. Monitor cluster health, manage deployments, install apps from a catalog, and configure alerts — all from a single web UI.

Built with **Next.js 16**, **React 19**, **TypeScript**, **MongoDB**, and **shadcn/ui**.

---

## Features

- **Cluster overview** — connection status, Kubernetes version, node count
- **Node table** — status, roles, OS, kernel version, resource capacity
- **App catalog** — one-click installs for Prometheus, Grafana, ingress-nginx, cert-manager, and more
- **Deployments** — GitHub and DockerHub-based deployment workflows with history
- **Deployment templates** — reusable YAML/config templates
- **Alert configuration** — per-cluster alert rules with webhook support
- **JWT authentication** — secure single-admin login with HTTP-only cookies, token rotation, and reuse detection
- **Dark / light theme**
- **Docker-ready** — multi-stage Dockerfile with standalone Next.js output

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, shadcn/ui, Tailwind CSS v4 |
| Animations | Framer Motion (`motion`) |
| Database | MongoDB via Mongoose |
| Auth | JWT (jose), Argon2id (argon2) |
| Kubernetes | `@kubernetes/client-node` |
| Containerisation | Docker (multi-stage) |

---

## Prerequisites

- Node.js 22+
- MongoDB instance
- `kubectl`-accessible Kubernetes clusters (kubeconfig files)

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/cluster-dashboard.git
cd cluster-dashboard
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb://user:password@host:27017/cluster_dashboard?authSource=admin
JWT_ACCESS_SECRET=<64-char hex>   # openssl rand -hex 32
JWT_REFRESH_SECRET=<64-char hex>  # openssl rand -hex 32
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
```

Generate secrets quickly:

```bash
openssl rand -hex 32   # run twice — once for each secret
```

### 3. Seed the admin user

```bash
npm run seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin credentials.

---

## Docker Deployment

### Build

```bash
docker build -t cluster-dashboard .
```

### Run

```bash
docker run -p 3000:3000 \
  -e MONGODB_URI="mongodb://user:password@host:27017/cluster_dashboard?authSource=admin" \
  -e JWT_ACCESS_SECRET="<64-char hex>" \
  -e JWT_REFRESH_SECRET="<64-char hex>" \
  cluster-dashboard
```

All environment variables are injected at runtime — no secrets are baked into the image.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | 64-char hex secret for access tokens (15 min) |
| `JWT_REFRESH_SECRET` | Yes | 64-char hex secret for refresh tokens (7 days) |
| `ADMIN_USERNAME` | Seed only | Admin login username |
| `ADMIN_PASSWORD` | Seed only | Admin login password |

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Protected pages (clusters, detail)
│   ├── login/              # Public login page
│   ├── actions/            # Server actions (clusters, k8s, auth)
│   └── api/auth/refresh/   # Token refresh endpoint
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   └── ...                 # Feature components
└── lib/
    ├── db.ts               # MongoDB CRUD helpers
    ├── models/             # Mongoose schemas
    ├── kubernetes.ts       # Kubernetes client wrapper
    ├── auth.ts             # Auth utilities (Node.js runtime)
    └── auth-edge.ts        # Auth utilities (Edge runtime)
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Create the admin user in MongoDB |

---

## Roadmap

See [todo.md](./todo.md) for the full phased feature roadmap.

---

## License

[MIT](./LICENSE)
