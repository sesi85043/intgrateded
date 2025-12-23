# Admin Hub - Unified Platform Management

## Overview
Admin Hub is a comprehensive dashboard designed for centralized management of various communication, analytics, and email platforms including Metabase, Chatwoot, Typebot, Mailcow, and cPanel. Its primary purpose is to provide unified control and automate processes such as email account creation via cPanel. The project aims to streamline administrative tasks, improve operational efficiency, and offer a single pane of glass for managing diverse business tools.

## User Preferences
- Follows existing project conventions (React hooks, Express middleware pattern)
- TypeScript strict mode
- Component-based architecture
- Database-first approach with Drizzle ORM
- Activity logging for audit trails
- Secure password handling with hashing

## System Architecture
The Admin Hub is built with a modern web stack: React for the frontend, Express.js with Node.js for the backend, and PostgreSQL as the database.

**UI/UX Decisions:**
- Uses Radix UI, Shadcn/ui, and Tailwind CSS for a consistent and modern design system.
- Features a unified inbox interface for managing communications.
- Provides a Service Status Dashboard with color-coded cards for quick visual identification of integration statuses.
- Integrates Activity Logs directly into relevant management sections for easy auditing.

**Technical Implementations & Feature Specifications:**
- **Frontend:** React 18 with Vite and TypeScript for a fast and type-safe user interface.
- **Backend:** Express.js handles API routes, authentication, and integration logic.
- **Database:** PostgreSQL is used for data persistence, with Drizzle ORM for schema management.
- **Real-time:** WebSocket support for live updates across the platform (e.g., message updates, typing indicators).
- **Authentication:** Session-based authentication for development and Replit Auth for production environments.
- **RBAC:** A 4-tier role hierarchy (Superuser, Management, Department Admin, Technician) provides granular access control.
- **Automated Email Provisioning:** Integrates with cPanel UAPI to automatically create email accounts for new users, tracking them in the database with secure password hashing (PBKDF2-SHA512).
- **Chatwoot Integration:** Provides a unified inbox, real-time message updates, and automatic Chatwoot agent creation upon user registration.
- **Security:** Implements robust security headers (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy), secure password handling, and API token masking.
- **Monitoring:** Includes `/api/health` for uptime monitoring and `/api/ready` for deployment readiness checks.
- **Environment Management:** Automatic validation of required environment variables on startup.
- **Project Structure:** Clear separation of concerns with dedicated folders for client, server, shared schemas, and database migrations.

**System Design Choices:**
- Prioritizes a component-based architecture for maintainability and reusability.
- Employs a database-first approach for data modeling.
- Focuses on auditability through comprehensive activity logging.
- Designed for Replit deployment, with specific configurations for hosting and development.

## Replit Setup (December 23, 2025)

### Environment & Deployment
- **Database:** PostgreSQL (Replit managed) connected via DATABASE_URL
- **Workflow:** "Start application" configured on port 5000 with webview output
- **Build Format:** Fixed esbuild to use `--format=esm` for proper ES Module compatibility with `.mjs` files
- **Frontend:** Configured with Vite on port 5000, `allowedHosts: true` for Replit proxy support
- **Backend:** Express.js serving combined API + static frontend on port 5000
- **Deployment:** Configured for autoscale deployment with `npm run build` and `npm run start`

### Recent Fixes (Replit Import)
1. **Fixed build format mismatch:** Changed esbuild from `--format=cjs` to `--format=esm` to align with package.json `"type": "module"` and `.mjs` file extensions
2. **Removed invalid runtime flag:** Deleted `--input-type=module` from start-prod script (not allowed when pointing to actual files)
3. **Fixed storage.getRoles():** Changed to `storage.getRoleByCode()` which is the actual implemented method
4. **Fixed undefined OTP handling:** Added null check before accessing `validOtp.id`
5. **Commented out unimplemented mailbox provisioning:** Disabled `createMailcowMailbox()` call and related code paths
6. **All LSP diagnostics resolved:** No remaining type errors

### Running the App
- Start workflow: `npm run dev` (development with Vite HMR)
- Build: `npm run build` (Vite + esbuild production bundle)
- Production: `npm run start` (runs dist/index.mjs)
- Database: `npm run db:push` (sync Drizzle schema)

## External Dependencies
- **Chatwoot:** For unified inbox and communication management.
- **cPanel UAPI:** For automated email account provisioning.
- **PostgreSQL:** Primary database for all application data.
- **Metabase:** Integrated for analytics and business intelligence (management via platform).
- **Typebot:** Integrated for chat flow management (management via platform).
- **Mailcow:** Integrated for email server management (management via platform).
- **Evolution API:** Integrated for WhatsApp communication (management via platform).
- **Google Fonts:** Used for typography.