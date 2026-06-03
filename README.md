# FluxFlow

A monorepo asset management system for tracking assets and storage rooms via QR code scanning. Built with a Bun-powered backend and a cross-platform frontend targeting both desktop (Electron) and mobile (Capacitor).

> **Repository:** https://github.com/CharbelMt/FluxFlow

---

## Repository Structure

```
fluxflow/
├── backend/          # REST API — Bun + Drizzle ORM + PostgreSQL
└── desktop-mobile/   # Cross-platform UI — Quasar + Electron + Capacitor
```

---

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Node.js](https://nodejs.org) >= 18 (required by Electron/Capacitor tooling)
- PostgreSQL instance (local or remote)
- For Android builds: Android Studio + SDK
- For iOS builds: Xcode (macOS only)

---

## Backend

### 1. Install dependencies

```bash
cd backend
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fluxflow
PORT=3000
```

### 3. Run migrations

```bash
bun run db:migrate
```

### 4. Start the server

```bash
bun run dev
```

The API will be available at `http://localhost:3000`.

---

## Desktop / Mobile (Quasar)

### 1. Install dependencies

```bash
cd desktop-mobile
bun install
```

### 2. Configure environment

```bash
cp .env.electron.example .env.electron
cp .env.capacitor.example .env.capacitor
```

Set the backend API URL in each file accordingly.

### 3. Run in browser (for development)

```bash
bun run dev
```

### 4. Run as desktop app (Electron)

```bash
bun run dev:electron
```

### 5. Run on mobile (Capacitor)

Sync the web build to the native project first:

```bash
bun run build
bun run sync          # or: npx cap sync
```

Then open in the respective IDE:

```bash
npx cap open android  # Android Studio
npx cap open ios      # Xcode (macOS only)
```

- Note: Check package.json for dev scripts

---

## Running the Full Stack

Start both services in separate terminals:

```bash
# Terminal 1 — backend
cd backend && bun run dev

# Terminal 2 — frontend
cd desktop-mobile && bun run dev
```

---

## Features

- QR code scanning for assets and storage rooms
- Asset tracking with serial numbers, status, and maintenance intervals
- Room management with location details and GPS coordinates
- Recent scan history
- Multi-language support (i18n)
