# Admin Hub - Unified Platform Management

## Overview
Admin Hub is a unified platform management application that centralizes control over Metabase, Chatwoot, Typebot, and Mailcow. It allows users to manage accounts, monitor analytics, and streamline operations from one powerful dashboard.

## Project Structure
```
├── client/           # React frontend with Vite
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and query client
│   │   └── pages/        # Page components
│   └── index.html
├── server/           # Express backend
│   ├── app.ts           # Express app setup
│   ├── routes.ts        # API routes
│   ├── db.ts            # Database connection
│   └── auth.ts          # Authentication
├── shared/           # Shared code between client/server
│   └── schema.ts        # Drizzle ORM schema
├── migrations/       # Database migrations
└── attached_assets/  # Project assets
```

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, shadcn/ui, Wouter, TanStack Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy

## Development
- Run `npm run dev` to start the development server
- The app runs on port 5000 (both frontend and backend)
- Database URL is configured via `DATABASE_URL` environment variable

## Build & Deploy
- Run `npm run build` to build for production
- Run `npm run start` to start the production server
- Production server runs on port 5000

## User Provisioning Flow
When a user registers and gets approved by management:
1. **Mailcow Integration**: Auto-generates company email (`surname.firstname_department@domain`)
2. **Chatwoot Integration**: Creates agent account and assigns to department's team
3. **Managed Users**: Tracks platform accounts linked to each team member

Provisioning is triggered via the approval workflow or manually via `/api/integrations/provision/:teamMemberId`.

## Tiered Support Architecture

The Admin Hub implements a tiered support system for message routing:

### How It Works
- **Parent Email (support@allelectronics.co.za)**: Messages go to the "All Staff" team - everyone sees them
- **Department Emails (ha@, hhp@, dtv@)**: Messages only visible to that department's team members

### Teams Structure
1. **All Staff Team** (`all_staff`): Default team - all new staff auto-join. Receives parent email messages.
2. **Department Teams** (HA, HHP, DTV): Only members of that department join. Receives department-specific messages.

### Database Tables
- `teams`: Internal teams for message routing
- `team_member_teams`: Many-to-many junction table (staff can be in multiple teams)

### Key Storage Methods
- `getTeamsForMember(teamMemberId)`: Get all teams a staff member belongs to
- `getTeamIdsForMember(teamMemberId)`: Get team IDs for filtering messages
- `getMembersInTeam(teamId)`: Get all staff in a specific team
- `addMemberToTeam()` / `removeMemberFromTeam()`: Manage team membership
- `autoJoinDefaultTeams(teamMemberId)`: Auto-enroll new staff in default teams

### Message Filtering Logic
```typescript
const userTeamIds = await storage.getTeamIdsForMember(userId);
const messages = await fetchMessagesForTeams(userTeamIds);
```

### Team API Endpoints
```
GET  /api/teams                  - List all teams
GET  /api/teams/:id              - Get single team
POST /api/teams                  - Create team (Management only)
PATCH /api/teams/:id             - Update team (Management only)
DELETE /api/teams/:id            - Delete team (Management only)
GET  /api/teams/:id/members      - Get members in a team
POST /api/teams/:teamId/members/:memberId   - Add member to team
DELETE /api/teams/:teamId/members/:memberId - Remove member from team
GET  /api/my-teams               - Get current user's teams
GET  /api/my-team-ids            - Get current user's team IDs (for filtering)
GET  /api/team-members/:id/teams - Get teams for a specific member
```

### Default Login
- **Email**: admin@company.com
- **Password**: admin123

See `docs/TIERED_SUPPORT_IMPLEMENTATION_GUIDE.md` for complete implementation details.

## Recent Changes
- December 11, 2025: Added Team API endpoints for tiered support management
- December 11, 2025: Seeded database with default teams (All Staff, HA, HHP, DTV) and admin user
- December 11, 2025: Implemented tiered support architecture with teams and many-to-many membership
- December 10, 2025: Initial setup in Replit environment
- Fixed duplicate mailcowConfig export in schema
- Implemented full provisionTeamMember function with Mailcow + Chatwoot integration
- Auto-assigns Chatwoot agents to their department teams on approval
