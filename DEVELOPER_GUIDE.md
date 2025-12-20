# Admin Hub - Developer Guide

A comprehensive guide for developers working on the Admin Hub project.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           Frontend (React + Vite)               │
│  - TypeScript + Tailwind CSS                    │
│  - React Query for state management             │
│  - Radix UI + shadcn/ui components              │
│  - WebSocket hooks for real-time               │
└────────────────┬────────────────────────────────┘
                 │ HTTP + WebSocket
                 ▼
┌─────────────────────────────────────────────────┐
│        Backend (Express + TypeScript)           │
│  - REST API endpoints                           │
│  - WebSocket server (/ws)                       │
│  - Authentication & RBAC middleware             │
│  - Database ORM (Drizzle)                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     PostgreSQL Database (Neon)                  │
│  - conversations, messages, contacts            │
│  - contacts_chatwoot, messages_chatwoot         │
│  - users, teams, activity_logs                  │
└─────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
admin-hub/
├── client/                          # Frontend (React)
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── message-thread.tsx   # Main conversation view
│   │   │   ├── message-composer.tsx # Message input/send
│   │   │   ├── conversation-list.tsx# Inbox view
│   │   │   ├── typing-indicator.tsx # Real-time typing
│   │   │   └── ui/                  # Radix UI + shadcn components
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts      # WebSocket connection hook
│   │   │   ├── useNotifications.ts  # Desktop notifications
│   │   │   ├── useAuth.ts           # Authentication context
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── queryClient.ts       # React Query configuration
│   │   │   └── utils.ts             # Utility functions
│   │   ├── App.tsx                  # Main app component
│   │   └── index.css                # Global styles (Tailwind)
│   ├── vite.config.ts               # Vite configuration
│   ├── tsconfig.json                # TypeScript config
│   └── package.json
│
├── server/                          # Backend (Express + Node)
│   ├── app.ts                       # Express app setup
│   ├── index-dev.ts                 # Development entry point
│   ├── index-prod.ts                # Production entry point
│   ├── routes.ts                    # Main route definitions
│   ├── routes-chatwoot.ts           # Chatwoot-specific routes
│   ├── routes-teams.ts              # Team management routes
│   ├── chatwoot-client.ts           # Chatwoot API client
│   ├── websocket.ts                 # WebSocket server setup
│   ├── auth.ts                      # Authentication middleware
│   ├── rbac.ts                      # Role-based access control
│   ├── storage.ts                   # Database access layer
│   └── provisioning.ts              # Mailbox provisioning
│
├── shared/                          # Shared types & schemas
│   └── schema.ts                    # Zod schemas + TypeScript types
│
├── db/                              # Database
│   └── schema.ts                    # Drizzle ORM schema
│
├── replit.md                        # Project documentation
├── USER_GUIDE.md                    # User documentation
└── DEVELOPER_GUIDE.md               # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (managed by Replit)
- PostgreSQL database (managed by Replit)
- Environment variables configured

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env.local (or use Replit secrets)
DATABASE_URL=postgresql://...
NODE_ENV=development

# Start development server
npm run dev

# Run TypeScript check
npm run check

# Build for production
npm run build
```

### Development Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run check        # TypeScript type checking
npm run db:push      # Sync database schema
npm run db:studio    # Open Drizzle Studio
```

---

## 🔌 REST API Endpoints

### Authentication
```
GET /api/auth/user
- Returns current authenticated user
- Requires: isAuthenticated middleware
- Response: { id, email, role, permissions }
```

### Conversations (Chatwoot)
```
GET /api/chatwoot/conversations
- List all conversations with pagination
- Query params: page, limit, status
- Response: { data: Conversation[], total: number }

GET /api/chatwoot/conversations/:id
- Get conversation with full message history
- Response: { conversation: Conversation, messages: Message[] }

POST /api/chatwoot/conversations/:id/messages
- Send a message to conversation
- Body: { content: string, messageType: "text" | "image", isPrivate: boolean }
- Response: { success: boolean, message: Message }

PATCH /api/chatwoot/conversations/:id
- Update conversation status
- Body: { status: "open" | "pending" | "resolved" }
- Response: { success: boolean, conversation: Conversation }
```

### Contacts (Chatwoot)
```
GET /api/chatwoot/contacts
- List all contacts
- Response: { data: Contact[] }

GET /api/chatwoot/contacts/:id
- Get contact details
- Response: { contact: Contact }
```

---

## 🔌 WebSocket Events

### Server Events (Server → Client)

**Connection Established**
```typescript
{
  type: "user-typing",
  payload: {
    userId: string,
    conversationId: string,
    isTyping: boolean,
    agentName: string
  }
}
```

**New Message**
```typescript
{
  type: "message-received",
  payload: {
    conversationId: string,
    message: Message,
    senderId: string,
    senderType: "agent" | "customer",
    timestamp: ISO8601
  }
}
```

**Status Changed**
```typescript
{
  type: "status-updated",
  payload: {
    conversationId: string,
    status: "open" | "pending" | "resolved",
    updatedBy: string
  }
}
```

**Agent Status**
```typescript
{
  type: "agent-status-changed",
  payload: {
    agentId: string,
    status: "online" | "offline" | "away",
    agentName: string
  }
}
```

### Client Events (Client → Server)

**Authenticate**
```typescript
{
  type: "auth",
  payload: {
    userId: string,
    conversationId: string,
    agentId: string
  }
}
```

**Send Typing Indicator**
```typescript
{
  type: "typing",
  payload: {
    isTyping: boolean,
    agentName: string
  }
}
```

---

## 🗄️ Database Schema

### Key Tables

#### conversations
```typescript
id: number (primary key)
chatwootConversationId: number (unique)
accountId: number
contactId: number (foreign key)
status: "open" | "pending" | "resolved"
subject: string
lastMessageAt: timestamp
createdAt: timestamp
updatedAt: timestamp
```

#### messages
```typescript
id: number (primary key)
chatwootMessageId: number (unique)
conversationId: number (foreign key)
senderId: number
content: string
messageType: "text" | "image" | "file"
isPrivate: boolean
createdAt: timestamp
```

#### contacts
```typescript
id: number (primary key)
chatwootContactId: number (unique)
accountId: number
name: string
email: string
phone: string
avatar: string
createdAt: timestamp
updatedAt: timestamp
```

#### users
```typescript
id: varchar (primary key, UUID)
username: string (unique)
email: string (unique)
role: "admin" | "manager" | "agent"
permissions: string[] (JSON array)
isVerified: boolean
createdAt: timestamp
updatedAt: timestamp
```

**View full schema:** `db/schema.ts`

---

## 🧩 Component Architecture

### Key Components

#### MessageThread (`client/src/components/message-thread.tsx`)
- Displays conversation messages in chronological order
- Shows typing indicators
- Integrates WebSocket for real-time updates
- Manages conversation status
- Props: `conversationId`, `conversation`, `onMessageSent`

#### MessageComposer (`client/src/components/message-composer.tsx`)
- Input field for composing messages
- Public/Private toggle
- Character counter (max 1,000)
- Send button with Ctrl+Enter shortcut
- Props: `conversationId`, `onMessageSent`

#### ConversationList (`client/src/components/conversation-list.tsx`)
- Sidebar showing all conversations
- Shows unread count, last message, channel
- Filters by status and search
- Props: `onConversationSelect`

#### TypingIndicator (`client/src/components/typing-indicator.tsx`)
- Animated dots showing "Agent is typing"
- Props: `agentName`

---

## 🎣 Custom Hooks

### useWebSocket
```typescript
const {
  isConnected,           // boolean - connection status
  send,                  // (message) => void
  sendTyping,            // (isTyping, agentName) => void
  sendMessageNotification, // (message) => void
  sendStatusChange,      // (status) => void
  markMessageAsRead,     // (messageId) => void
} = useWebSocket(conversationId, userId, {
  onMessage: (msg) => {},
  onTyping: (data) => {},
  onMessageReceived: (data) => {},
  onStatusChanged: (data) => {},
  onAgentStatus: (data) => {},
  onMessageRead: (data) => {}
});
```

### useNotifications
```typescript
const {
  isSupported,          // boolean - browser supports notifications
  isGranted,            // boolean - permission granted
  requestPermission,    // () => Promise<boolean>
  sendNotification,     // (title, options) => void
} = useNotifications();
```

### useAuth
```typescript
const {
  user,                 // Current authenticated user
  isLoading,            // boolean - loading auth
  logout,               // () => void
} = useAuth();
```

---

## 🔐 Authentication & Authorization

### Middleware Stack

```typescript
// server/auth.ts
isAuthenticated           // Checks valid session
isTeamMemberAuthenticated // Checks team membership
requireRole('admin')      // Checks specific role
requirePermission('manage_agents') // Checks permissions
```

### Role-Based Access Control (RBAC)

**Roles:**
- `admin` - Full access to system
- `manager` - Team and conversation management
- `agent` - Can reply to conversations, view team

**Adding Permission Check:**
```typescript
app.patch('/api/conversations/:id', 
  isTeamMemberAuthenticated,
  requirePermission('update_conversation'),
  async (req, res) => {
    // Only users with permission can execute
  }
);
```

---

## 📦 Adding New Features

### 1. **Adding a New API Endpoint**

```typescript
// server/routes.ts

app.get('/api/feature/:id', isTeamMemberAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    const data = await storage.getFeature(id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get feature' });
  }
});
```

### 2. **Adding a New Component**

```typescript
// client/src/components/new-component.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NewComponentProps {
  data: any;
  onAction: (value: string) => void;
}

export default function NewComponent({ data, onAction }: NewComponentProps) {
  const [state, setState] = useState('');

  return (
    <div className="p-4 border rounded-lg">
      {/* Component JSX */}
      <Button onClick={() => onAction(state)}>Action</Button>
    </div>
  );
}
```

### 3. **Adding WebSocket Event Handler**

```typescript
// server/websocket.ts - add to switch statement

case "custom-event":
  broadcastToConversation(payload.conversationId, {
    type: "custom-response",
    payload: {
      conversationId: payload.conversationId,
      data: payload.data
    }
  });
  break;
```

### 4. **Adding Database Schema Change**

```typescript
// db/schema.ts
export const newTable = pgTable('new_table', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  customField: varchar('custom_field'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Then run:
// npm run db:push
```

---

## 🧪 Testing

### API Testing
```bash
# Using curl
curl http://localhost:5000/api/chatwoot/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Using Postman
Import the API collection and test endpoints
```

### WebSocket Testing
```typescript
// In browser console
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    payload: { userId: 'test', conversationId: '123' }
  }));
};

ws.onmessage = (event) => {
  console.log('Message:', JSON.parse(event.data));
};
```

---

## 🐛 Debugging

### Enable Debug Logging
```typescript
// server/app.ts
export function log(message: string, context: string) {
  if (process.env.DEBUG) {
    console.log(`[${context}] ${message}`);
  }
}
```

### Run with Debug
```bash
DEBUG=true npm run dev
```

### Check Database
```bash
# Open Drizzle Studio
npm run db:studio
```

### Browser DevTools
- **Network tab** - View API requests and WebSocket messages
- **Console tab** - Check for errors and logs
- **React DevTools** - Inspect component props and state
- **Redux DevTools** - (if using Redux) inspect state changes

---

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables (Production)
```
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-key
CHATWOOT_API_KEY=your-api-key
```

### Deployment Checklist
- [ ] Run `npm run check` - no TypeScript errors
- [ ] Run `npm run build` - builds successfully
- [ ] Test all API endpoints
- [ ] Test WebSocket connection
- [ ] Verify database schema synced
- [ ] Set environment variables
- [ ] Deploy frontend and backend
- [ ] Test in production

---

## 🎨 Code Style & Conventions

### TypeScript
- Use strict mode (`strict: true` in tsconfig.json)
- Type all function parameters and returns
- Use interfaces for object shapes
- Avoid `any` type

### Naming Conventions
- Components: `PascalCase` (e.g., `MessageThread`)
- Functions/variables: `camelCase` (e.g., `sendMessage`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_MESSAGE_LENGTH`)
- Database columns: `snake_case` (e.g., `created_at`)

### File Organization
- One component per file
- Group related utilities in folders
- Index files for exports
- Keep component files <400 lines

### Styling
- Use Tailwind CSS for styling
- Use Radix UI for accessible components
- Follow existing color schemes
- Responsive design: mobile-first

---

## 📚 Key Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| react | UI library | ^18 |
| react-query | State management | ^3 |
| react-hook-form | Form handling | ^7 |
| zod | Schema validation | ^3 |
| express | Backend framework | ^4 |
| drizzle-orm | Database ORM | ^0.x |
| ws | WebSocket library | ^8 |
| tailwindcss | CSS framework | ^3 |
| typescript | Type checking | ^5 |

---

## 🔗 Quick Links

- **Replit Project**: [Admin Hub on Replit]()
- **Chatwoot Docs**: https://www.chatwoot.com/docs
- **React Query Docs**: https://tanstack.com/query/latest
- **Drizzle Docs**: https://orm.drizzle.team
- **Tailwind Docs**: https://tailwindcss.com/docs

---

## 📞 Common Tasks

### How to add a new message type?
1. Update `Message` interface in `shared/schema.ts`
2. Add handler in `MessageBubble` component
3. Update Chatwoot API integration if needed
4. Test with new message type

### How to add a new conversation filter?
1. Add filter UI in `ConversationList` component
2. Update API endpoint to accept filter params
3. Add filter logic in `storage.ts`
4. Test with various filters

### How to add agent presence tracking?
1. Send `agent-status` events via WebSocket
2. Store in active connections map
3. Broadcast on login/logout
4. Listen in frontend and update UI

### How to handle API errors gracefully?
1. Wrap API calls in try/catch
2. Show user-friendly error toast
3. Log error details for debugging
4. Optionally retry for network errors

---

## ✅ Best Practices

- ✅ Always validate input with Zod schemas
- ✅ Use React Query for server state management
- ✅ Implement error boundaries for React
- ✅ Keep components under 400 lines
- ✅ Use TypeScript strict mode
- ✅ Test API changes manually before committing
- ✅ Document complex business logic
- ✅ Use environment variables for config
- ✅ Implement proper authentication checks
- ✅ Log important events for debugging

---

## ❌ Avoid These

- ❌ Direct database queries in routes (use storage layer)
- ❌ Hardcoded configuration values
- ❌ Synchronous database operations
- ❌ Unhandled Promise rejections
- ❌ Missing error handling in async functions
- ❌ Prop drilling (use context for shared state)
- ❌ Direct DOM manipulation (use React)
- ❌ Inline styles (use Tailwind classes)
- ❌ Console logs in production code
- ❌ Storing sensitive data in frontend

---

## 🆘 Troubleshooting

### WebSocket Connection Fails
```
Error: WebSocket connection failed
Fix: Check if backend is running on correct port
```

### Database Connection Error
```
Error: connect ECONNREFUSED
Fix: Verify DATABASE_URL and PostgreSQL is running
```

### TypeScript Compilation Fails
```
Error: Type 'X' is not assignable to type 'Y'
Fix: Run `npm run check` to see all errors, fix type mismatches
```

### Messages Not Appearing in Real-time
```
Check: WebSocket connection status
Check: Browser console for errors
Fix: Refresh page or check network tab
```

---

**Happy coding! Questions? Check the inline code comments or review similar implementations.** 🚀
