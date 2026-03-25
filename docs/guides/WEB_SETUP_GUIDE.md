# ChatApp Web Development Setup Guide

This guide will help you set up and run the ChatApp web application for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - **Required for this monorepo**
- **Git**

## Project Structure

```
chatapp/
├── apps/
│   ├── web/                    # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/        # Page components
│   │   │   ├── redux/         # Redux store and slices
│   │   │   └── ...
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── .env.example
│   ├── backend/               # Node.js backend API
│   ├── mobile/                # React Native mobile app
│   ├── desktop/               # Electron desktop app
│   └── ...
├── packages/
│   └── shared/                # Shared TypeScript types
├── infrastructure/            # Docker and deployment configs
├── scripts/                   # Build and utility scripts
├── docs/                      # Documentation and guides
├── package.json              # Root monorepo configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
└── tsconfig.base.json        # Base TypeScript configuration
```

## Setup Instructions

### 1. Install Dependencies

**From the project root**, install all workspace dependencies:

```bash
cd chatapp
pnpm install
```

This will install dependencies for all workspaces (web, backend, mobile, desktop, shared).

### 2. Environment Configuration

Create environment files for each workspace as needed:

```bash
# Web environment
cd chatapp/apps/web
cp .env.example .env

# Backend environment - use the Docker example as reference
cd chatapp
cp .env.docker.example .env.local
```

Edit the `.env` files with your configuration:

```env
# Web Environment (apps/web/.env)
# Backend API + Socket.IO URL
VITE_API_URL=http://localhost:4000

# Supabase
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_KEY=<anon-key>

# Google OAuth
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>

# Sentry (optional)
VITE_SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/0
VITE_SENTRY_RELEASE=chatapp-web@1.0.0
```

For backend configuration, edit `.env.local` in the project root with variables like:
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis connection
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth credentials
- `RESEND_API_KEY` - Email service API key

### 3. Start Development Servers

Run the specific workspace you want to develop:

```bash
# Web frontend
cd chatapp
pnpm dev:web

# Backend API
cd chatapp
pnpm dev:backend

# Mobile app
cd chatapp
pnpm dev:mobile

# Desktop app
cd chatapp
pnpm dev:desktop

# All services at once (in parallel)
cd chatapp
pnpm dev
```

**Or navigate to specific directories:**

```bash
# Web
cd chatapp/apps/web && pnpm dev

# Backend
cd chatapp/apps/backend && pnpm dev

# Mobile
cd chatapp/apps/mobile && pnpm start

# Desktop
cd chatapp/apps/desktop && pnpm dev
```

The web application will start at: **http://localhost:5173** (Vite's default port)

## Available Scripts

Here are the main pnpm scripts available:

### Development
- `pnpm dev:web` - Start web development server with hot reload
- `pnpm dev:backend` - Start backend development server
- `pnpm dev:mobile` - Start mobile app development server
- `pnpm dev:desktop` - Start desktop app development server
- `pnpm dev` - Run all workspaces in parallel

### Building
- `pnpm build:web` - Build web for production with sourcemaps
- `pnpm build:backend` - Build backend for production
- `pnpm build` - Build all workspaces

### Quality Assurance
- `pnpm typecheck` - Run TypeScript type checking across all workspaces
- `pnpm lint` - Run linting across all workspaces

### Development Utilities
- `pnpm docker:up` - Start Docker Compose stack
- `pnpm docker:down` - Stop Docker Compose stack
- `pnpm tunnel` - Start ngrok tunnel for external access
- `pnpm dev:tunneled` - Start backend + web with ngrok tunnel

### Workspace Management
- `pnpm install` - Install dependencies for all workspaces
- `pnpm clean` - Clean node_modules and dist folders across all workspaces

## Development Features

When running in development mode, you get:

- **Hot Module Replacement (HMR)** - Changes appear instantly
- **Source Maps** - Easy debugging in browser dev tools
- **API Proxy** - `/api` requests proxy to backend at `http://localhost:4000`
- **Error Overlay** - Development errors shown in browser

## Browser Support

The application supports:
- Chrome (latest)
- Firefox (latest)  
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Common Issues

**Port 5173 already in use:**
```bash
# Kill existing process
npx kill-port 5173

# Or use different port (Vite will auto-assign)
pnpm dev:web
```

**Dependency issues:**
```bash
# Clear cache and reinstall
pnpm store prune

# From project root
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**TypeScript errors:**
```bash
# Check TypeScript configuration across all workspaces
pnpm typecheck

# Check specific workspace
pnpm --filter web exec tsc --noEmit
```

### Development Tips

1. **Keep backend running** - The frontend proxies API calls to `localhost:4000`
2. **Use browser dev tools** - Source maps make debugging easy
3. **Check console** - Look for network errors or missing dependencies
4. **Hot reload** - Changes to components auto-refresh the browser
5. **Use pnpm dev** - Start all services at once for full-stack development

## Production Deployment

For production deployment:

```bash
# Build web application
pnpm build:web

# The build output will be in apps/web/dist
# Deploy the apps/web/dist folder to your hosting service
```

## Next Steps

Once the development server is running:

1. Open **http://localhost:5173** in your browser
2. Navigate through the application
3. Check browser console for any errors
4. Start developing your features!

## Monorepo Benefits

With pnpm workspace, you get:

- **Faster installations** - Shared dependencies are deduplicated
- **Consistent versions** - Single source of truth for all packages
- **Workspace linking** - Shared packages automatically linked
- **Disk space savings** - No duplicate node_modules across workspaces

## Additional Resources

- **Project Structure**: Use `pnpm tree` to visualize the workspace
- **Docker Development**: Use `pnpm docker:up` for containerized development
- **External Testing**: Use `pnpm tunnel` to expose your local server for testing
- **Type Safety**: Run `pnpm typecheck` to ensure type correctness across all workspaces

## Need Help?

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the browser console for specific errors
3. Ensure all dependencies are properly installed
4. Verify your `.env` configuration

Happy coding! 🚀
