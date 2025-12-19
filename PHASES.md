# Admin Hub - Implementation Phases

A phased approach to building the unified inbox where agents handle emails and WhatsApps from Chatwoot without leaving the Admin Hub.

## Phase 1: Foundation & Chatwoot Integration ✅ (CURRENT)

**Goal:** Connect Admin Hub to Chatwoot API and sync conversations locally

**Tasks:**
- [x] Database schema: conversations, messages, contacts tables
- [x] Chatwoot API client service
- [x] Backend endpoints to fetch/sync conversations
- [ ] Test API connectivity with real Chatwoot instance

**Key Files:**
- `shared/schema.ts` - New tables: conversations, messages, contacts
- `server/chatwoot-client.ts` - Chatwoot API wrapper
- `server/routes-chatwoot.ts` - Sync endpoints
- `server/routes.ts` - Integrated endpoints

**Deliverables:**
- GET `/api/chatwoot/conversations` - List all conversations
- POST `/api/chatwoot/sync` - Manual sync trigger
- Conversations stored in local database for querying

---

## Phase 2: Unified Inbox UI

**Goal:** Build frontend to display all conversations in one interface

**Tasks:**
- Build inbox list component (conversations from both WhatsApp + Email)
- Conversation detail view with message thread
- Contact information panel
- Real-time status updates

**Key Files:**
- `client/src/pages/inbox.tsx` - Main inbox page
- `client/src/components/conversation-list.tsx`
- `client/src/components/conversation-detail.tsx`
- `client/src/components/message-thread.tsx`

**Deliverables:**
- Unified inbox showing messages sorted by date
- Channel badges (WhatsApp, Email) on messages
- Contact details and conversation metadata
- Search and filter conversations

---

## Phase 3: Reply & Send Functionality

**Goal:** Enable agents to reply to messages directly from Admin Hub

**Tasks:**
- Reply UI component with message composer
- Send message through Chatwoot API
- Agent assignment and status tracking
- Message history and context

**Key Files:**
- `client/src/components/message-composer.tsx`
- `server/routes-chatwoot.ts` - Add message send endpoint

**Deliverables:**
- POST `/api/chatwoot/messages` - Send message
- Message sent through correct channel (WhatsApp/Email)
- Agent assignment to conversations
- Status: open, resolved, waiting for response

---

## Phase 4: Real-time Updates & Polish

**Goal:** Live message updates and refined UX

**Tasks:**
- WebSocket integration for real-time messages
- Agent presence and status updates
- Notification system for new messages
- Performance optimization
- Complete testing and bug fixes

**Key Files:**
- `server/app.ts` - WebSocket setup
- `client/src/hooks/useConversations.ts` - Real-time listener

**Deliverables:**
- Real-time message updates
- Agent online/offline status
- Desktop notifications
- Typing indicators
- Message read receipts

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Admin Hub Frontend (React)            │
│  ┌──────────────────────────────────────────┐   │
│  │      Unified Inbox Component             │   │
│  │  - Conversation List                     │   │
│  │  - Message Thread View                   │   │
│  │  - Message Composer & Reply              │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ API + WebSocket
                 ▼
┌─────────────────────────────────────────────────┐
│      Admin Hub Backend (Express + WS)           │
│  ┌──────────────────────────────────────────┐   │
│  │    Chatwoot API Client Service           │   │
│  │  - Fetch Conversations                   │   │
│  │  - Send Messages                         │   │
│  │  - Sync WhatsApp + Email                 │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     PostgreSQL Database (Local Cache)           │
│  - conversations (synced from Chatwoot)         │
│  - messages (synced from Chatwoot)              │
│  - contacts (synced from Chatwoot)              │
│  - agent_assignments (local tracking)           │
└─────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   Chatwoot Cloud (Source of Truth)              │
│  - Actual conversations                         │
│  - Message routing                              │
│  - Agent management                             │
│  - WhatsApp + Email channels                    │
└─────────────────────────────────────────────────┘
```

## Configuration

Your Admin Hub will need:
- **Chatwoot Instance URL** - e.g., `https://chatwoot.yourdomain.com`
- **Chatwoot API Token** - From Chatwoot account settings
- **Chatwoot Account ID** - Your account ID in Chatwoot
- **Webhook Secret** (optional) - For real-time updates

Store these in environment variables via Replit Secrets or `chatwoot_config` table.

## Getting Started

1. **Phase 1** - Run migrations and test Chatwoot connection
2. **Phase 2** - Build the inbox UI once API is working
3. **Phase 3** - Add reply functionality
4. **Phase 4** - Real-time updates and polish

Each phase builds on the previous one. Don't skip phases!
