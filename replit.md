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

## Recent Changes
- December 10, 2025: Initial setup in Replit environment
- Fixed duplicate mailcowConfig export in schema
- Implemented full provisionTeamMember function with Mailcow + Chatwoot integration
- Auto-assigns Chatwoot agents to their department teams on approval
