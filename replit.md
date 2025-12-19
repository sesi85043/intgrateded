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
- ✅ Configuration UI in Integrations tab with test connection
- ✅ API endpoints fully functional for querying and syncing

### ✅ Phase 2: Unified Inbox UI (COMPLETE)
**Completed:** December 19, 2025

**What's implemented:**
- ✅ Conversation list component with search by name/email/phone
- ✅ Message thread display with sender info and timestamps
- ✅ Channel badges (WhatsApp, Email, Chat)
- ✅ Conversation status badges (Open, Pending, Resolved, Snoozed)
- ✅ Unread message counters
- ✅ Split-view layout: conversation list (left) + message thread (right)
- ✅ Manual sync button to pull latest conversations
- ✅ Statistics dashboard (Open, Pending, Resolved counts)
- ✅ Quick replies sidebar for common responses
- ✅ Responsive design for desktop/tablet

**Testing Phase 2:**
1. Go to Inbox tab (top navigation)
2. Click "Sync" to pull conversations from Chatwoot
3. Select a conversation from the left sidebar
4. View the message thread on the right
5. Use search bar to filter conversations

### 🔜 Phase 3: Reply & Send Functionality (NEXT)
See `PHASES.md` for complete roadmap and next phases.

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
