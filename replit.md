# Admin Hub - Unified Platform Management

A comprehensive admin dashboard for managing Metabase, Chatwoot, Typebot, Mailcow, and cPanel integrations. Built with React + Express + PostgreSQL.

## Project Overview

**Purpose:** Centralized control over multiple communication, analytics, and email platforms with automated email account creation via cPanel.

**Current Status:** 
- ✅ Phase 1: Foundation & Chatwoot Integration (Complete)
- ✅ Phase 2: Unified Inbox UI (Complete)
- ✅ Phase 3: Reply & Send Functionality (Complete)
- ✅ Phase 4: Real-time Updates & Polish (Complete)
- ✅ Phase 5: Automated Email Creation via cPanel (Complete)
- ✅ **Replit Setup & Deployment Ready (Complete)**

## Replit Setup Status

- ✅ PostgreSQL database created and configured
- ✅ Database schema pushed (all tables including email_accounts)
- ✅ Frontend (React + Vite) running on port 5000
- ✅ Backend (Express) running on port 5000
- ✅ CORS configured for Replit proxy compatibility
- ✅ Workflow configured for development
- ✅ Deployment configuration set up (autoscale)

## Technology Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Express.js + Node.js
- **Database:** PostgreSQL (Replit-managed)
- **UI Components:** Radix UI + Shadcn/ui + Tailwind CSS
- **Real-time:** WebSocket support for live updates
- **Authentication:** Session-based (dev) / Replit Auth (production)
- **Email Provisioning:** cPanel UAPI integration

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
│   ├── routes-integrations.ts # Integration config & cPanel
│   ├── chatwoot-client.ts    # Chatwoot API client
│   ├── cpanel-client.ts     # cPanel API client
│   ├── auth.ts          # Authentication setup
│   ├── db.ts            # Database connection
│   └── websocket.ts     # WebSocket server
├── shared/              # Shared types/schemas
│   └── schema.ts        # Drizzle ORM schema
├── migrations/          # Database migrations
└── package.json         # Dependencies
```

## Setup & Running

### Development Server
The application is already configured and running. To start manually:
```bash
npm install          # Install dependencies (if needed)
npm run db:push      # Sync database schema
npm run dev          # Start dev server on http://localhost:5000
```

### Build & Production
```bash
npm run build       # Build frontend + backend
npm run start       # Start production server
```

## Key Features

### Phase 1-4: Communication & Dashboard
- ✅ Chatwoot integration with unified inbox
- ✅ Real-time message updates via WebSocket
- ✅ User & team management with RBAC
- ✅ Department management with tiered support
- ✅ Activity logging for audit trails
- ✅ Analytics dashboard

### Phase 5: Automated Email Provisioning via cPanel
**Goal:** Automatically create email accounts when new employees join the system

**Features:**
- ✅ cPanel UAPI integration for email account creation
- ✅ Secure password hashing with salt (PBKDF2-SHA512)
- ✅ Email account tracking in database
- ✅ Configuration management via integrations UI
- ✅ Activity logging for email creation

**How It Works:**
1. Admin configures cPanel credentials in Integrations tab
   - Hostname (e.g., cpanel.yourdomain.com)
   - API Token (from cPanel account settings)
   - cPanel Username
   - Domain for email accounts

2. When creating a new employee/user:
   - Admin initiates email account creation
   - System calls cPanel UAPI endpoint
   - Email account created instantly (e.g., john.doe@company.com)
   - Password stored securely (hashed, never in plaintext)

3. Email accounts tracked in database for audit trail

## Database Schema

Key tables:
- `users` - User accounts with authentication
- `team_members` - Users with roles and permissions
- `conversations` - Synced from Chatwoot
- `messages` - Individual messages in conversations
- `contacts` - Customer/contact information
- `agent_assignments` - Which agents are assigned to conversations
- `chatwoot_config` - Chatwoot integration credentials
- `cpanel_config` - cPanel integration credentials
- `email_accounts` - Created email accounts
- `roles` - RBAC role definitions
- `permissions` - Granular action permissions
- `departments` - Organization structure
- `activity_logs` - Audit trail

## Environment Variables

Auto-created by Replit:
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST` - Database host
- `PGPORT` - Database port
- `PGUSER` - Database user
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

Development defaults:
- `NODE_ENV` - Set to "development"
- Default dev credentials (after seed):
  - Email: `admin@company.com`
  - Password: `admin123`

Optional:
- `CORS_ORIGIN` - Comma-separated allowed origins (default: all in dev)
- `DEV_AUTH_BYPASS` - Set to "true" to bypass auth in development (NEVER in production)

## API Authentication

Protected endpoints require authentication. Two auth methods available:
1. **Replit Auth** - Production environment
2. **Session-based** - Development environment with email/password

## cPanel Email Integration

### Configuration Endpoints

**GET `/api/integrations/cpanel/config`**
- Get current cPanel configuration
- Requires MANAGEMENT role

**POST `/api/integrations/cpanel/config`**
- Create or update cPanel configuration
- Body: `{ hostname, apiToken, cpanelUsername, domain, enabled }`
- Requires MANAGEMENT role

**POST `/api/integrations/cpanel/test`**
- Test cPanel connection
- Body: `{ hostname, apiToken, cpanelUsername }`
- Returns: `{ success, message }`

### Email Account Management

**POST `/api/integrations/cpanel/email/create`**
- Create email account for a team member
- Body: `{ teamMemberId, email, password, quota? }`
- Returns: `{ success, email, message }`
- Requires MANAGEMENT role
- Password is hashed with PBKDF2-SHA512 before storage

**GET `/api/integrations/cpanel/email/:teamMemberId`**
- Get all email accounts for a team member
- Returns: Array of email accounts (without password hashes)

### Security Implementation

**Password Hashing:**
- Uses Node.js `crypto.pbkdf2Sync()` with:
  - 100,000 iterations (PBKDF2)
  - 64-byte hash length
  - SHA-512 algorithm
  - 16-byte random salt per password
  - Format: `salt:hash` stored in database

**API Token Security:**
- API tokens are masked in responses (only last 4 chars visible)
- Full tokens only sent during configuration
- Never logged or exposed in error messages

**Email Account Tracking:**
- All email creation logged in activity_logs table
- Email status tracked (active, suspended, deleted)
- Quota management per account

## Development Notes

### Replit Configuration
The app is optimized for Replit:
- **Frontend Host:** `0.0.0.0:5000` (listens on all interfaces)
- **CORS:** Enabled for all origins in dev mode (Replit proxy compatible)
- **allowedHosts:** `true` (accepts any host header)
- **HMR:** Configured with secure WebSocket over `wss://`

### Vite Configuration
- Host: `0.0.0.0` (listens on all interfaces)
- Port: `5000` (only exposed port)
- HMR: WebSocket over secure connection
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
- **Build:** `npm run build`
- **Start:** `npm run start`
- **Deployment type:** autoscale (auto-scales based on traffic)
- **Port:** 5000 (auto-exposed)

The app is ready to publish. Click the "Publish" button in Replit to deploy it live.

## Known Issues & TODOs

- [ ] UI frontend for cPanel email account creation (can use existing integrations UI)
- [ ] Bulk email account creation endpoint
- [ ] Email account suspension/deletion endpoints
- [ ] Password reset functionality
- [ ] Email quota management UI
- [ ] Integration with user creation flow (auto-create email when user created)

## User Preferences

- Follows existing project conventions (React hooks, Express middleware pattern)
- TypeScript strict mode
- Component-based architecture
- Database-first approach with Drizzle ORM
- Activity logging for audit trails
- Secure password handling with hashing

## Support

For issues or questions, refer to the implementation phases document in `attached_assets/`.

---

**Last Updated:** December 22, 2025
**Status:** ✅ Fully set up and running in Replit
**Version:** 1.0.2 (Phase 5 Complete - cPanel Email Automation Ready)
