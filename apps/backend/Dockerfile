# ─── Stage 1: Base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

RUN npm install -g pnpm

# FIXED: added .npmrc (node-linker=hoisted) and tsconfig.base.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json    ./apps/backend/

RUN pnpm install --frozen-lockfile

# FIXED: expose hoisted bin path so pnpm scripts resolve correctly
ENV PATH=/app/node_modules/.bin:$PATH

COPY packages/shared/ ./packages/shared/
COPY apps/backend/    ./apps/backend/

# FIXED: stay at /app — bins are hoisted here, not in apps/backend


# ─── Stage 2: Development ─────────────────────────────────────────────────────
FROM base AS development
USER nodejs
EXPOSE 4000
# FIXED: use --filter so pnpm runs from /app and resolves ts-node-dev correctly
CMD ["pnpm", "--filter", "@chatapp/backend", "dev"]


# ─── Stage 3: Builder ─────────────────────────────────────────────────────────
FROM base AS builder
# FIXED: use --filter, PATH already set in base stage
RUN pnpm --filter @chatapp/backend build


# ─── Stage 4: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json    ./apps/backend/

RUN pnpm install --frozen-lockfile --prod

# FIXED: copy shared source so runtime module resolution works
COPY packages/shared/ ./packages/shared/

COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist      ./apps/backend/dist
COPY --chown=nodejs:nodejs                apps/backend/healthcheck.mjs ./apps/backend/healthcheck.mjs

WORKDIR /app/apps/backend

USER nodejs
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.mjs

CMD ["node", "dist/server.js"]