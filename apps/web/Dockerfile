# web/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing support
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]