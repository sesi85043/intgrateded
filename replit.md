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

## Recent Changes
- December 10, 2025: Initial setup in Replit environment
- Fixed duplicate mailcowConfig export in schema
- Added provisioning export for routes-integrations
