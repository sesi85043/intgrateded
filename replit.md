# Admin Hub

## Overview
Admin Hub is a unified platform management application that provides centralized control over Metabase, Chatwoot, Typebot, and Mailcow. It allows managing users, monitoring analytics, and streamlining operations from one powerful dashboard.

## Project Structure
- `client/` - React frontend built with Vite
- `server/` - Express.js backend API
- `shared/` - Shared code and Drizzle ORM schema
- `migrations/` - Database migration files

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI, React Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite for frontend, esbuild for backend

## Development
- Run `npm run dev` to start the development server
- Frontend and backend are served together on port 5000
- Database schema is in `shared/schema.ts`

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run db:push` - Push schema to database

## Phase Status

### ✅ Phase 1: Foundation & Chatwoot Integration (COMPLETE)
**Completed:** December 19, 2025

**What's implemented:**
- ✅ Database schema for conversations, messages, contacts, agent assignments
- ✅ Chatwoot API client service (`server/chatwoot-client.ts`)
- ✅ Backend routes for syncing conversations (`server/routes-chatwoot.ts`)
- ✅ API endpoints:
  - `GET /api/chatwoot/conversations` - List all conversations
  - `POST /api/chatwoot/sync` - Manual sync from Chatwoot
  - `GET /api/chatwoot/conversations/:id` - Get conversation with messages
  - `POST /api/chatwoot/conversations/:id/messages` - Send message through Chatwoot

**Testing Phase 1:**
1. Configure Chatwoot in database: `chatwoot_config` table
2. Call `POST /api/chatwoot/sync` to pull conversations from your Chatwoot instance
3. Verify conversations appear in database via `GET /api/chatwoot/conversations`

### 🔜 Phase 2: Unified Inbox UI (NEXT)
See `PHASES.md` for complete roadmap.

## Deployment

### Replit Development
- Run `npm run dev` to start the development server
- Database: Auto-provisioned Replit PostgreSQL

### Docker Deployment (VPS/Production)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete Docker setup instructions.

**Quick Start:**
```bash
cp .env.example .env
# Edit .env with your VPS credentials
docker compose up -d
```

This will automatically:
- Build the application image
- Start PostgreSQL database
- Run database migrations
- Seed the database with initial roles, permissions, and admin account

## Environment Variables

### Development (Replit)
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `NODE_ENV` - development or production
- Chatwoot config is stored in `chatwoot_config` table in the database

### Docker Deployment
- See `.env.example` for all required variables
- Key variables: `DATABASE_URL`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`
