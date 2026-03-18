# Stage 1: Base
FROM node:20-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

# Stage 2: Development
FROM base AS development
USER nodejs
EXPOSE 4000
CMD ["pnpm", "dev"]

# Stage 3: Builder
FROM base AS builder
RUN pnpm build

# Stage 4: Production
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy production dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy healthcheck script
COPY --chown=nodejs:nodejs healthcheck.mjs ./healthcheck.mjs

USER nodejs
EXPOSE 4000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.mjs

CMD ["node", "dist/server.js"]