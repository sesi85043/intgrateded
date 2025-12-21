# Admin Hub - Unified Platform Management

A comprehensive admin dashboard for managing Metabase, Chatwoot, Typebot, and Mailcow integrations. Built with React + Express + PostgreSQL.

## Project Overview

**Purpose:** Centralized control over multiple communication and analytics platforms with a unified inbox for handling emails and WhatsApps from Chatwoot.

**Current Status:** 
- ✅ Phase 1: Foundation & Chatwoot Integration (Complete)
- ✅ Phase 2: Unified Inbox UI (Complete)
- 📋 Phase 3: Reply & Send Functionality (Ready to start)

## Technology Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL (Neon)
- **UI Components:** Radix UI + Shadcn/ui + Tailwind CSS
- **Real-time:** WebSocket support for live updates
- **Authentication:** Replit Auth + Local session management

## Project Structure

```
.
├── client/                 # React frontend
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/        # Page components (dashboard, inbox, etc.)
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities
├── server/               # Express backend
│   ├── routes.ts        # Main API routes
│   ├── routes-chatwoot.ts    # Chatwoot integration
│   ├── routes-integrations.ts # Integration config
│   ├── auth.ts          # Authentication setup
│   ├── db.ts            # Database connection
│   └── websocket.ts     # WebSocket server
├── shared/              # Shared types/schemas
│   └── schema.ts        # Drizzle ORM schema
├── migrations/          # Database migrations
└── package.json         # Dependencies
```

## Setup & Running

### Prerequisites
- Node.js installed (handled by Replit)
- PostgreSQL database (created via Replit)

### Development Server
```bash
npm install          # Install dependencies
npm run db:push      # Initialize database schema
npm run seed        # Seed database with initial data
npm run dev         # Start dev server on http://localhost:5000
```

### Build & Production
```bash
npm run build       # Build frontend + backend
npm run start       # Start production server
```

## Key Features

### Phase 1 & 2: Chatwoot Integration + Unified Inbox
- ✅ Database tables: conversations, messages, contacts, agent_assignments
- ✅ Chatwoot API client service (`server/chatwoot-client.ts`)
- ✅ Backend API endpoints:
  - `GET /api/chatwoot/conversations` - List all conversations
  - `POST /api/chatwoot/sync` - Manual sync from Chatwoot
  - `GET /api/chatwoot/conversations/:id` - Get conversation with messages
  - `POST /api/chatwoot/conversations/:id/messages` - Send message
  - `POST /api/integrations/chatwoot/config` - Save/test Chatwoot credentials
- ✅ Unified Inbox UI with:
  - Search conversations by name/email/phone
  - Channel badges (WhatsApp, Email, Chat)
  - Status badges (Open, Pending, Resolved, Snoozed)
  - Statistics dashboard
  - Message thread view

### Phase 3: Reply & Send Functionality (Next)
- Message composer component
- Send messages through Chatwoot API
- Agent assignment to conversations
- Mark conversations as resolved/pending
- Message validation and error handling

### Other Features
- User & Team Management
- Department management with tiered support
- Role-based access control (RBAC)
- Activity logging
- Task management
- Analytics dashboard
- Staff registration & approval workflow

## Database Schema

Key tables:
- `team_members` - Users with roles and permissions
- `conversations` - Synced from Chatwoot
- `messages` - Individual messages in conversations
- `contacts` - Customer/contact information
- `agent_assignments` - Which agents are assigned to conversations
- `chatwoot_config` - Chatwoot integration credentials

## Environment Variables

Required (auto-created):
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - development/production

Optional:
- `CORS_ORIGIN` - Comma-separated allowed origins (default: all in dev)
- `DEV_AUTH_BYPASS` - Set to "true" to bypass auth in development (NEVER in production)

## API Authentication

Protected endpoints require authentication. Two auth methods available:
1. **Replit Auth** - Production environment
2. **Session-based** - Development environment with email/password

Default dev credentials (after seed):
- Email: `admin@company.com`
- Password: `admin123`

## Development Notes

### CORS Configuration
The app allows all origins in development mode (auto-detected) for Replit iframe compatibility.

### Vite Configuration
- Host: `0.0.0.0` (listens on all interfaces)
- Port: `5000` (only exposed port)
- HMR: WebSocket for hot module replacement
- allowedHosts: `true` (accepts any host header)

### WebSocket
Real-time updates via WebSocket at `/ws`:
- Message updates
- Typing indicators
- Agent presence
- Status changes
- Read receipts

## Deployment

Configured for Replit hosting:
- Build: `npm run build`
- Start: `npm run start`
- Deployment type: autoscale

## Known Issues & TODOs

- [ ] Phase 3: Implement reply/send functionality
- [ ] Phase 4: Real-time WebSocket updates (framework ready)
- [ ] Fix TypeScript errors in some client pages
- [ ] Optimize database queries for large conversation volumes
- [ ] Add comprehensive testing

## User Preferences

- Follows existing project conventions (React hooks, Express middleware pattern)
- TypeScript strict mode
- Component-based architecture
- Database-first approach with Drizzle ORM
- Activity logging for audit trails

## Support

For issues or questions, refer to the implementation phases document in `attached_assets/`.

---

**Last Updated:** December 21, 2025
**Version:** 1.0.0 (MVP)
