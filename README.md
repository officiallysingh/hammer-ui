## Requirements

Node.js 20+
npm 10+
Docker + Docker Compose (for containerized dev/prod)

## Next.js Monorepo (npm workspaces + Turborepo)

Production-grade monorepo setup:

- Next.js (App Router) + TypeScript
- npm workspaces + Turborepo
- ESLint + Prettier
- Husky + lint-staged
- Jest + React Testing Library
- Playwright (E2E)
- Tailwind CSS + shadcn/ui
- Sentry
- Docker (Next standalone) + Nginx reverse proxy
- Healthcheck + Metrics endpoints

## Repo Structure

apps/
web/ # Next.js app
packages/
config-eslint/ # shared eslint config
config-prettier/ # shared prettier config
config-ts/ # shared tsconfig base
nginx/
default.conf # nginx reverse-proxy config
docker-compose.yml # prod-like (nginx + standalone)
docker-compose.dev.yml # dev (HMR)
turbo.json
package.json

## Install

# Local

- From repo root
  npm install

Option A: Local dev (no docker)
npm run dev

Option B: Docker dev (recommended for parity)
docker compose -f docker-compose.dev.yml up --build

# Prod (Docker + Nginx)

Builds Next.js in standalone mode and runs behind Nginx (reverse proxy)
docker compose up --build

Open: http://localhost:3000

## Healthcheck

curl http://localhost:3000/api/health

## Metrics

curl http://localhost:3000/api/metrics
