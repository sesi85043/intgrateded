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

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-provided by Replit)
- `NODE_ENV` - development or production
