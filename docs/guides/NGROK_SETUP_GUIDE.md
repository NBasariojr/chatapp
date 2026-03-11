# 🚇 ngrok Pro Setup Guide

> Monorepo setup for `chatapp` — PowerShell + pnpm + auto `.env` patching

---

## 📋 Table of Contents

1. [Where Does ngrok Live?](#where-does-ngrok-live)
2. [One-Time Installation](#one-time-installation)
3. [File Structure](#file-structure)
4. [ngrok.yml — Root Config](#ngrokyml--root-config)
5. [Daily Workflow](#daily-workflow)
6. [Setup Checklist](#setup-checklist)

---

## Where Does ngrok Live?

| Location | Verdict | Reason |
|---|---|---|
| **Backend** (port 4000) | ✅ Tunnel goes here | Single source of truth for all clients |
| Frontend / Web | ❌ Not needed | Browser fetches the ngrok URL directly |
| `ngrok.yml` | ✅ Root of monorepo | Shared config, monorepo-wide concern |
| `scripts/` | ✅ Root of monorepo | PowerShell script lives here |

---

## One-Time Installation

Run in PowerShell:

```powershell
# Option A — winget (recommended, no admin needed)
winget install ngrok.ngrok

# Option B — Chocolatey
choco install ngrok

# Authenticate (saves token to ~\.ngrok2\ngrok.yml globally)
ngrok config add-authtoken YOUR_TOKEN_HERE
```

Get your authtoken at → [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)

---

## File Structure

After setup, your monorepo will have these new files:

```
chatapp/
├── ngrok.yml                  ← tunnel config
├── scripts/
│   └── ngrok-start.ps1        ← auto-patches all .env files
├── backend/
│   └── .env.development       ← gets NGROK_URL= patched automatically
├── web/
│   └── .env.development       ← gets VITE_API_URL= patched automatically
└── mobile/
    └── .env                   ← gets EXPO_PUBLIC_API_URL= patched automatically
```

---

## `ngrok.yml` — Root Config

```yaml
version: "2"
# authtoken is already saved globally via `ngrok config add-authtoken`
# Uncomment below to override per-project (useful for team sharing):
# authtoken: YOUR_TOKEN_HERE

tunnels:
  backend:
    proto: http
    addr: 4000
    # Optional: reserved domain (paid plans only)
    # hostname: your-app.ngrok.app
---

## Daily Workflow

Open **3 terminals** in your monorepo root:

```powershell
# Terminal 1 — start the tunnel (patches all .env files automatically)
pnpm tunnel

# Terminal 2 — start backend (picks up new NGROK_URL)
pnpm dev:backend

# Terminal 3 — start web (picks up new VITE_API_URL)
pnpm dev:web

# For mobile testing — Expo reads EXPO_PUBLIC_API_URL automatically
pnpm dev:mobile
```

**Inspect all traffic** at → [http://localhost:4040](http://localhost:4040)

> ⚠️ **Important:** Always start `pnpm tunnel` first, then start your dev servers. The tunnel URL changes every session (free plan), so the `.env` patch must run before the servers boot.

---

*Generated for `chatapp` monorepo — pnpm workspaces + PowerShell + TypeScript*