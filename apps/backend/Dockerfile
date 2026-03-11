# backend/Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

# Development
FROM base AS development
CMD ["pnpm", "dev"]

# Production build
FROM base AS builder
RUN pnpm build

FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/server.js"]