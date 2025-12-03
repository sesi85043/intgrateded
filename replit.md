# Admin Hub - Staff Onboarding and Platform Management System

## Overview

Admin Hub is a unified management platform built with Express.js and React that provides comprehensive staff onboarding, role-based access control (RBAC), and multi-platform integration capabilities. The system manages internal team members and their access to external platforms (Metabase, Chatwoot, Typebot, and Mailcow) through a centralized dashboard.

The application serves as an administrative hub for MM ALL ELECTRONICS, handling everything from new staff registration workflows to day-to-day task management and platform analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Stack

**Frontend Architecture**
- React 18+ with TypeScript for type safety
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn UI component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Form handling via React Hook Form with Zod validation

**Backend Architecture**
- Express.js REST API with TypeScript
- Session-based authentication with configurable auth strategies:
  - Development mode: Local authentication with bcrypt password hashing
  - Production mode: Replit/Standalone OIDC integration
- Drizzle ORM for type-safe database operations
- PostgreSQL database with connection pooling via `pg`

**Build System**
- Vite for frontend bundling with HMR support
- esbuild for production server bundling
- Separate development and production entry points for optimal workflows

### Authentication & Authorization

**Multi-Strategy Authentication**
- Development: Email/password authentication with bcrypt
- Production: OpenID Connect (OIDC) integration for Replit deployments
- Express sessions stored in PostgreSQL via `connect-pg-simple`
- Session TTL: 7 days with HTTP-only cookies

**Role-Based Access Control (RBAC)**
- Three-tier role hierarchy with numeric levels:
  - TECHNICIAN (level 1): Basic task and worklog access
  - DEPARTMENT_ADMIN (level 2): Department-level user management
  - MANAGEMENT (level 3): Global system administration
- Granular permission system with 15+ permission types
- Middleware guards: `requirePermission`, `requireRole`, `requireRoleOrHigher`, `requireDepartmentAccess`
- Team members linked to departments for organizational scoping

### Staff Onboarding Workflow

**Secure Registration Pipeline**
- Multi-step registration form collecting:
  - Personal information (name, email, phone)
  - Residential address (full address fields)
  - Two next-of-kin emergency contacts with relationships
  - Department selection
- Math CAPTCHA verification to prevent automated submissions
- Password hashing before storage using bcrypt
- Applications stored in `pending_registrations` table with status tracking

**Admin Approval Process**
- Management receives notifications of pending registrations
- One-Time Password (OTP) generation for secure approval verification
- OTPs stored in `approval_otps` table with expiration (30 minutes)
- Admin reviews complete applicant details before approval/rejection
- Upon approval:
  - Pending registration promoted to `team_members` table
  - Role assignment from predefined roles
  - Account status set to active with `is_verified` flag
  - Approval metadata tracked (reviewer ID, timestamp)

### Database Schema Design

**Core Tables**
- `sessions`: Express session storage
- `team_members`: Internal staff accounts with extended profile data
- `pending_registrations`: Staff applications awaiting approval
- `approval_otps`: Time-limited verification codes for approvals
- `departments`: Organizational units (HA, HHP, DTV divisions)
- `roles`: Predefined access levels with hierarchical structure
- `permissions`: Granular capability definitions
- `role_permissions`: Many-to-many role-permission mappings

**Platform Integration**
- `managed_users`: Platform user records linked to team members
- `service_configs`: External platform API configurations
- `activity_logs`: Audit trail for administrative actions
- `analytics_metrics`: Cross-platform usage metrics

**Task Management**
- `tasks`: Work items with status, priority, due dates
- `task_assignments`: Many-to-many task-team member relationships
- `task_history`: State change audit log
- `worklogs`: Time and notes logged against tasks

### API Architecture

**Route Organization**
- `/api/auth/*`: Authentication endpoints (login, logout, user session)
- `/api/team-members/*`: Staff CRUD and platform assignment
- `/api/pending-registrations/*`: Registration workflow management
- `/api/departments/*`: Department CRUD operations
- `/api/roles/*` & `/api/permissions/*`: RBAC configuration
- `/api/tasks/*`: Task management with assignment logic
- `/api/services/*`: Platform configuration management
- `/api/analytics/*`: Cross-platform metrics aggregation
- `/api/activity/*`: Audit log retrieval

**Middleware Stack**
- Session management with PostgreSQL backing
- JSON body parsing with raw body preservation for webhooks
- Request logging with timing metrics
- RBAC authorization guards on protected routes

### Data Validation

**Schema-First Approach**
- Drizzle schema definitions in `shared/schema.ts` serve as single source of truth
- Zod schemas auto-generated from Drizzle schemas via `drizzle-zod`
- Runtime validation on API requests using Zod resolvers
- Type inference from Zod schemas ensures type safety across frontend/backend

### Migration Strategy

**Manual SQL Migrations**
- Migration scripts in TypeScript using `pg` client directly
- Scripts located in project root (e.g., `run-migration.ts`, `fix-schema.ts`)
- Executed via npm scripts or standalone during deployment
- Focus on additive changes (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`)
- Seed data for roles, permissions, departments, and default admin account

### Deployment Model

**Docker Containerization**
- Multi-stage Dockerfile for production builds
- Docker Compose for orchestrated deployment with PostgreSQL
- Environment variables for configuration (DATABASE_URL, SESSION_SECRET)
- VPS deployment guide with SSH-based automation scripts

**Environment Configuration**
- `.env.production` for production settings
- `DATABASE_URL` required for all environments
- Session secrets for cryptographic security
- OIDC configuration for Replit deployments (ISSUER_URL, REPL_ID)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via connection string
- **Drizzle ORM**: TypeScript ORM with schema management
- **pg**: PostgreSQL client library with connection pooling
- **connect-pg-simple**: PostgreSQL session store for Express

### Authentication Services
- **Replit OIDC**: Optional production authentication provider
- **openid-client**: OIDC client library for token handling
- **passport**: Authentication middleware (when using OIDC)
- **bcryptjs**: Password hashing for local authentication

### External Platform Integrations
- **Metabase**: Business intelligence and analytics (configurable API endpoint)
- **Chatwoot**: Customer support and messaging (configurable API endpoint)
- **Typebot**: Conversational forms and chatbots (configurable API endpoint)
- **Mailcow**: Email server management (configurable API endpoint)

Note: Platform integrations are configured via `service_configs` table with API URLs and authentication tokens. The system manages user mappings between internal team members and platform-specific user IDs.

### Third-Party Libraries
- **React Query (@tanstack/react-query)**: Server state management with automatic caching
- **Radix UI**: Unstyled accessible component primitives for Shadcn UI
- **date-fns**: Date formatting and manipulation
- **Zod**: Runtime type validation and schema parsing
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Frontend build tool with fast HMR

### Development Tools
- **TypeScript**: Static type checking across codebase
- **tsx**: TypeScript execution for development and scripts
- **esbuild**: Fast JavaScript bundler for production builds

## Replit Configuration

This project is configured to run seamlessly in the Replit environment:

### Development Setup
- **Port Configuration**: Application serves on port 5000 (both frontend and backend)
- **Host Binding**: Server binds to `0.0.0.0` to allow external access
- **Proxy Support**: Vite dev server configured with `allowedHosts: true` in `server/index-dev.ts` to work with Replit's wildcard proxy hostnames
- **HMR Settings**: Hot Module Replacement configured for secure WebSocket connections (WSS on port 443)

### Database
- Uses Replit's built-in PostgreSQL database
- Database URL provided via `DATABASE_URL` environment variable
- Schema managed via Drizzle ORM with `npm run db:push`
- Seeding via `npm run seed` creates initial admin account and demo data

### Workflow
- Single workflow: "Start application" runs `npm run dev`
- Combines Express backend with Vite middleware for unified development experience
- No separate frontend/backend workflows needed

### Initial Setup Commands
```bash
npm install              # Install dependencies
npm run db:push         # Sync database schema
npm run seed            # Seed initial data (creates admin@company.com / admin123)
npm run dev             # Start development server
```

### Deployment
- Deployment target: `autoscale` (stateless web application)
- Build command: `npm run build` (bundles frontend + backend)
- Run command: `npm start` (runs production server)
- Environment variables required: `DATABASE_URL`, `SESSION_SECRET`