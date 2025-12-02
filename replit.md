# Admin Hub - Multi-Platform Management System

## Overview

Admin Hub is a unified management platform built with Express.js and React that centralizes control over multiple integrated services (Metabase, Chatwoot, Typebot, and Mailcow). The application provides comprehensive staff onboarding, role-based access control (RBAC), task management, and cross-platform user administration through a single dashboard interface.

The system manages both internal team members and their associated platform accounts, enabling administrators to control access across multiple services while maintaining detailed activity logs and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design Patterns:**
- Component-based architecture with reusable UI components in `/client/src/components`
- Custom hooks pattern for shared logic (`useAuth`, `useToast`, `useIsMobile`)
- Page-based routing structure in `/client/src/pages`
- Form validation using React Hook Form with Zod schemas
- Optimistic UI updates through React Query mutations

**Key Features:**
- Dark/light theme support with localStorage persistence
- Responsive sidebar navigation with role-based menu items
- Multi-step forms for complex data entry (staff registration)
- Real-time data synchronization via query invalidation

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js framework
- TypeScript for type safety
- Drizzle ORM for database operations
- PostgreSQL as primary database (via Neon serverless or local)
- Express sessions for authentication state
- bcryptjs for password hashing

**Design Patterns:**
- Layered architecture: routes → storage layer → database
- Repository pattern implemented in `server/storage.ts`
- Middleware-based authentication and authorization
- Permission-based and role-based access control through custom middleware
- Environment-specific server configuration (dev vs production)

**Authentication Flow:**
The application supports two authentication modes:
1. **Development Mode** (`server/devAuth.ts`): Auto-login with seed user for local development
2. **Production Mode** (`server/replitAuth.ts` / `server/standaloneAuth.ts`): OAuth-based authentication using OpenID Connect

Session management uses PostgreSQL-backed session store with 7-day expiration.

### Role-Based Access Control (RBAC)

**Role Hierarchy:**
1. **Technician** (Level 1): Basic task access, view own department
2. **Department Admin** (Level 2): Department user management, department-wide visibility
3. **Management** (Level 3): Global access, cross-department management, user approval rights

**Permission System:**
Granular permissions control specific actions:
- Task operations (view, create, update, delete, assign)
- Department visibility (own vs all)
- Dashboard access (department vs global)
- User management scope (department vs global)
- Activity log access
- Service configuration management
- Analytics access
- Worklog submission

Permission checks are performed both server-side (middleware) and client-side (UI rendering).

### Data Models

**Core Entities:**

1. **Team Members**: Internal staff with departmental assignment and role-based permissions
   - Extended profile data including address and emergency contacts
   - Linked to platform accounts via managed users

2. **Pending Registrations**: Staff onboarding workflow
   - Multi-step form data collection
   - OTP-based approval mechanism
   - Admin review and role assignment

3. **Managed Users**: Platform user accounts
   - Multi-platform support (one record can represent users across Metabase, Chatwoot, etc.)
   - Platform-specific user IDs and roles stored as JSON
   - Linkage to team members for unified management

4. **Departments**: Organizational units with hierarchical access
   - Code-based identification
   - Status tracking (active/inactive)

5. **Tasks**: Work items with assignment and tracking
   - Status workflow (pending → in_progress → completed/on_hold/cancelled)
   - Department and team member assignment
   - Priority levels and due dates

6. **Activity Logs**: Audit trail for administrative actions
   - Records all CRUD operations
   - Captures actor, action, target, and metadata

**Database Schema Features:**
- UUID primary keys for all entities
- Timestamp tracking (created_at, updated_at)
- Soft deletes via status fields
- Foreign key constraints with cascade rules
- JSON columns for flexible metadata storage (platform_user_ids, roles)

### Staff Onboarding Workflow

**Registration Process:**
1. Prospective staff completes multi-step form with:
   - Personal information (name, email, phone)
   - Department selection
   - Residential address
   - Two emergency contacts (next of kin)
   - Password creation
   - CAPTCHA verification

2. Application stored in `pending_registrations` table
3. OTP generated and stored with 24-hour expiration
4. Management notified of pending registration
5. Admin reviews complete profile data
6. Admin approves/rejects using OTP verification
7. On approval:
   - Team member record created with assigned role
   - Pending registration marked as reviewed
   - User can now authenticate

**Security Measures:**
- Passwords hashed with bcryptjs before storage
- OTP-based approval prevents unauthorized activation
- All registration data validated server-side
- Simple math CAPTCHA prevents automated submissions

### API Structure

**Route Organization:**
- `/api/auth/*` - Authentication and session management
- `/api/team-members/*` - Team member CRUD and profile management
- `/api/departments/*` - Department management
- `/api/tasks/*` - Task creation and assignment
- `/api/managed-users/*` - Platform user management
- `/api/registrations/*` - Pending registration workflow
- `/api/services/*` - Service configuration
- `/api/analytics/*` - Metrics and reporting
- `/api/activity/*` - Activity log access

**Request/Response Patterns:**
- RESTful conventions (GET, POST, PATCH, DELETE)
- JSON payloads validated against Zod schemas
- Consistent error response format with status codes
- Session-based authentication via cookies

**Middleware Chain:**
1. Session restoration
2. Authentication check (`isAuthenticated`, `isTeamMemberAuthenticated`)
3. Permission verification (`requirePermission`, `requireRole`)
4. Request processing
5. Activity logging for write operations

### Migration Strategy

The project includes several migration scripts for database schema evolution:
- `create-all-tables.ts` - Initial schema setup
- `add-missing-columns.ts` - Incremental column additions
- `fix-fk-constraint.ts` - Foreign key relationship corrections
- `migrate-managed-users.ts` - Platform user table restructuring
- `apply-managed-users-teamid.ts` - Team member linkage addition

Migrations use raw SQL via `pg` client for precise control over schema changes. The pattern involves IF NOT EXISTS checks for idempotency.

## External Dependencies

### Third-Party Services

**Integrated Platforms (Managed via Admin Hub):**
- **Metabase**: Business intelligence and analytics dashboards
- **Chatwoot**: Customer support and messaging platform  
- **Typebot**: Conversational form builder and chatbot system
- **Mailcow**: Email server management interface

Service configurations stored in `service_configs` table with API endpoints, credentials, and enabled status.

### Database

**PostgreSQL:**
- Primary data store for all application entities
- Session storage via `connect-pg-simple`
- Accessed via Drizzle ORM with connection pooling
- Supports both Neon serverless (DATABASE_URL) and local PostgreSQL
- Connection string configured via environment variable

### UI Component Libraries

- **Radix UI**: Headless accessible component primitives (dialogs, dropdowns, etc.)
- **shadcn/ui**: Pre-styled component collection built on Radix
- **Lucide React**: Icon library
- **Recharts**: Data visualization and charting

### Authentication & Security

- **express-session**: Session management with PostgreSQL backing
- **bcryptjs**: Password hashing (10 rounds)
- **openid-client**: OAuth/OIDC integration for production auth
- **passport**: Authentication middleware (when using Replit/standalone auth)

### Utilities

- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date formatting and manipulation
- **nanoid**: Unique ID generation for sessions
- **memoizee**: Function result caching

### Build & Development

- **Vite**: Frontend build tool and dev server with HMR
- **esbuild**: Backend bundling for production
- **tsx**: TypeScript execution for development server
- **Drizzle Kit**: Database migration and schema management