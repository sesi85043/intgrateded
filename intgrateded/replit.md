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

## Implementation Status

### ✅ Phase 1: Foundation & Chatwoot Integration
**COMPLETE** - December 19, 2025

**Database:**
- conversations table - Synced conversations from Chatwoot
- messages table - Message history
- contacts table - Contact information
- agent_assignments table - Agent assignments

**Backend API Endpoints:**
- `GET /api/chatwoot/conversations` - List all conversations
- `POST /api/chatwoot/sync` - Manual sync trigger
- `GET /api/chatwoot/conversations/:id` - Get conversation with messages
- `POST /api/chatwoot/conversations/:id/messages` - Send message
- `PATCH /api/chatwoot/conversations/:id` - Update conversation status

**Implementation:**
- ChatwootClient API service fully operational
- Chatwoot configuration stored in database
- All endpoints protected with authentication

### ✅ Phase 2: Unified Inbox UI
**COMPLETE** - December 19, 2025

**Frontend Components:**
- `inbox.tsx` - Main inbox page with search, sync button, and statistics
- `conversation-list.tsx` - Conversation list with filtering and badges
- `message-thread.tsx` - Message thread display with timestamps
- Quick replies sidebar with customizable templates

**Features:**
- Search conversations by name/email/phone
- Channel badges (WhatsApp, Email, Chat)
- Status badges (Open, Pending, Resolved, Snoozed)
- Unread message counts
- Last message preview
- Statistics dashboard

### ✅ Phase 3: Reply & Send Functionality
**COMPLETE** - December 19, 2025

**New Components:**
- `message-composer.tsx` - Message composition with send functionality

**Features Implemented:**
- ✅ Compose and send messages directly from inbox
- ✅ Private/Public message toggle (visible to agents only or customers)
- ✅ Real-time message validation and error handling
- ✅ Conversation status management (Open, Pending, Resolved)
- ✅ Status action buttons for quick workflow
- ✅ Keyboard shortcut: Ctrl+Enter to send
- ✅ Character counter for messages
- ✅ Loading states and error feedback
- ✅ Automatic message refresh after sending

**Backend Enhancements:**
- `PATCH /api/chatwoot/conversations/:id` - Update status (new endpoint)
- Message sending with Chatwoot API integration
- Status sync to Chatwoot when configured
- Local database updates for offline reliability

**User Experience:**
- Messages appear in thread immediately (optimistic updates)
- Toast notifications for success/error
- Disabled send button for empty messages
- Visual feedback during sending
- Status buttons highlight current status

### ✅ Phase 4: Real-time Updates & Polish
**COMPLETE** - December 19, 2025

**New Infrastructure:**
- `websocket.ts` - WebSocket server for real-time events
- `useWebSocket.ts` - Frontend hook for WebSocket connections
- `useNotifications.ts` - Desktop notification support
- `typing-indicator.tsx` - Animated typing indicator component

**Real-time Features Implemented:**
- ✅ WebSocket server with event routing (`/ws` endpoint)
- ✅ Live message delivery to subscribed agents
- ✅ Typing indicators with automatic debounce
- ✅ Conversation status change broadcasts
- ✅ Agent presence tracking (online/offline)
- ✅ Message read receipts
- ✅ Desktop notifications for new messages
- ✅ Auto-reconnect with 3-second retry
- ✅ Connection status indicator in UI

**Frontend Integrations:**
- Message thread auto-refreshes on new messages
- Typing indicator shows who's typing
- Desktop notifications prompt on app load
- Connection status badge (reconnecting indicator)
- Real-time status updates reflected in UI

**WebSocket Event Types:**
- `auth` - Client authentication and subscription
- `typing` - Typing indicator broadcast
- `message-sent` - New message notification
- `status-changed` - Conversation status update
- `agent-status` - Agent online/offline status
- `mark-read` - Message read receipt

**Performance Optimizations:**
- Efficient connection pooling
- Automatic cleanup on disconnect
- Query cache invalidation on updates
- Minimal DOM re-renders with React hooks

## Development

### Running the App
```bash
npm install
npm run dev
```
- Frontend: http://localhost:5000 (Vite dev server)
- Backend: http://localhost:5000 (Express API)

### Database
```bash
npm run db:push     # Push schema to database
npm run migrate     # Run migrations
npm run seed        # Seed initial data
```

### Building for Production
```bash
npm run build       # Build frontend and backend
npm run start       # Start production server
```

## Deployment

### Replit Development
- Database: Auto-provisioned PostgreSQL (Neon)
- Server runs on port 5000
- Vite dev server with hot reload enabled

### Docker Deployment (VPS/Production)
See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete Docker setup instructions.

## Environment Variables

### Development (Replit)
- `DATABASE_URL` - PostgreSQL connection string (auto-provided)
- `NODE_ENV` - Set to 'development'

### Docker Deployment
- See `.env.example` for all required variables
- Key: `DATABASE_URL`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `ADMIN_PASSWORD`

## API Documentation

### Chatwoot Inbox Endpoints

#### List Conversations
```
GET /api/chatwoot/conversations
Authentication: Required
Response: { success: true, count: number, data: Conversation[] }
```

#### Sync Conversations
```
POST /api/chatwoot/sync
Authentication: Required
Response: { success: true, synced: number, errors: number }
```

#### Get Conversation
```
GET /api/chatwoot/conversations/:id
Authentication: Required
Response: { success: true, conversation: Conversation, messages: Message[] }
```

#### Send Message
```
POST /api/chatwoot/conversations/:id/messages
Authentication: Required
Body: { content: string, isPrivate?: boolean }
Response: { success: true, message: string, data: MessageResponse }
```

#### Update Status
```
PATCH /api/chatwoot/conversations/:id
Authentication: Required
Body: { status: "open" | "pending" | "resolved" }
Response: { success: true, message: string, data: Conversation }
```

## Status by Phase

| Phase | Backend | Frontend | Database | Status |
|-------|---------|----------|----------|--------|
| 1 | ✅ Complete | ✅ Config UI | ✅ 4 tables | ✅ DONE |
| 2 | Uses P1 API | ✅ Full UI | Uses P1 DB | ✅ DONE |
| 3 | ✅ Send & Status | ✅ Composer | Uses P1-P2 | ✅ DONE |
| 4 | ✅ WebSocket | ✅ Real-time UI | Uses P1-P3 | ✅ DONE |

## Architecture Completed

```
┌─────────────────────────────────────────────────┐
│           Admin Hub Frontend (React)            │
│  ┌──────────────────────────────────────────┐   │
│  │   Message Thread with Real-time Updates  │   │
│  │  - Live Messages & Typing Indicators     │   │
│  │  - Desktop Notifications                 │   │
│  │  - Status Management                     │   │
│  │  - WebSocket Connection Status           │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ WebSocket + REST API
                 ▼
┌─────────────────────────────────────────────────┐
│  Admin Hub Backend (Express + WebSocket)        │
│  ┌──────────────────────────────────────────┐   │
│  │  WebSocket Server (/ws)                  │   │
│  │  - Event Routing & Broadcasting          │   │
│  │  - Active Connection Management          │   │
│  │  - Presence Tracking                     │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │  REST API + Authentication Middleware    │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     PostgreSQL Database (Local Cache)           │
│  - conversations, messages, contacts, etc.      │
└─────────────────────────────────────────────────┘
```

## Project Complete ✨

All 4 phases delivered:
- **Phase 1**: Chatwoot Integration Foundation
- **Phase 2**: Unified Inbox UI
- **Phase 3**: Reply & Send Functionality  
- **Phase 4**: Real-time Updates & Polish

The Admin Hub is now a fully functional unified inbox with real-time messaging, live status updates, and agent notifications.

## Technical Notes

- All endpoints are protected with `isTeamMemberAuthenticated` middleware
- Message sending is async with proper error handling
- Conversation status updates sync to both local DB and Chatwoot
- Frontend uses React Query for state management
- TailwindCSS + Radix UI for consistent component styling
- TypeScript for type safety across frontend and backend
