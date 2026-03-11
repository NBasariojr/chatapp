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
├── web/                    # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── redux/         # Redux store and slices
│   │   └── ...
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── backend/                 # Node.js backend
├── mobile/                  # React Native mobile app
├── desktop/                 # Electron desktop app
└── packages/
    └── shared/             # Shared TypeScript types
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
cd chatapp/web
cp .env.example .env

# Backend environment (if needed)
cd chatapp/backend
cp .env.example .env
```

Edit the `.env` files with your configuration:

```env
# API Configuration (web/.env)
VITE_API_URL=http://localhost:4000

# Other environment variables as needed
```

### 3. Start Development Servers

Run the specific workspace you want to develop:

```bash
# Web frontend
cd chatapp
pnpm --filter web dev

# Backend API
cd chatapp
pnpm --filter backend dev

# Mobile app
cd chatapp
pnpm --filter mobile start

# Desktop app
cd chatapp
pnpm --filter desktop dev
```

**Or navigate to specific directories:**

```bash
# Web
cd chatapp/web && pnpm dev

# Backend
cd chatapp/backend && pnpm dev

# Mobile
cd chatapp/mobile && pnpm start

# Desktop
cd chatapp/desktop && pnpm dev
```

The web application will start at: **http://localhost:3000** (or 3001 if 3000 is busy)

## Available Scripts

Here are the main pnpm scripts available:

### Development
- `pnpm --filter web dev` - Start web development server with hot reload
- `pnpm --filter backend dev` - Start backend development server
- `pnpm --filter mobile start` - Start mobile app development server
- `pnpm --filter desktop dev` - Start desktop app development server
- `pnpm dev` - Install and run all workspaces in development mode

### Building
- `pnpm --filter web build` - Build web for production with sourcemaps
- `pnpm --filter web serve` - Preview web production build locally

### Quality Assurance
- `pnpm --filter web test` - Run Jest tests for web
- `pnpm --filter web lint` - Run ESLint for code quality

### Workspace Management
- `pnpm install` - Install dependencies for all workspaces
- `pnpm build` - Build all workspaces
- `pnpm test` - Test all workspaces

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

**Port 3000 already in use:**
```bash
# Kill existing process
npx kill-port 3000

# Or use different port (pnpm will auto-assign)
pnpm --filter web dev
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
# Check TypeScript configuration
npx tsc --noEmit

# Run linter to see specific issues
pnpm --filter web lint
```

### Development Tips

1. **Keep backend running** - The frontend proxies API calls to `localhost:4000`
2. **Use browser dev tools** - Source maps make debugging easy
3. **Check console** - Look for network errors or missing dependencies
4. **Hot reload** - Changes to components auto-refresh the browser

## Production Deployment

For production deployment:

```bash
# Build web application
pnpm --filter web build

# The build output will be in /dist
# Deploy the /dist folder to your hosting service
```

## Next Steps

Once the development server is running:

1. Open **http://localhost:3000** (or 3001 if 3000 is busy) in your browser
2. Navigate through the application
3. Check browser console for any errors
4. Start developing your features!

## Monorepo Benefits

With pnpm workspace, you get:

- **Faster installations** - Shared dependencies are deduplicated
- **Consistent versions** - Single source of truth for all packages
- **Workspace linking** - Shared packages automatically linked
- **Disk space savings** - No duplicate node_modules across workspaces

## Need Help?

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the browser console for specific errors
3. Ensure all dependencies are properly installed
4. Verify your `.env` configuration

Happy coding! 🚀
