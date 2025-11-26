# Admin Dashboard - Multi-Platform Management System

## Overview

This is a unified admin dashboard application for managing multiple self-hosted platforms (Metabase, Chatwoot, Typebot, and Mailcow) from a single interface. The dashboard provides centralized user management, analytics monitoring, activity logging, and service configuration across all integrated platforms.

The application enables administrators to:
- Create, edit, and deactivate user accounts across multiple platforms
- Monitor analytics and metrics from integrated services
- Track administrative actions through activity logs
- Configure API connections and credentials for external services
- Access a unified interface for multi-platform operations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and development server.

**UI Component System**: 
- Built on shadcn/ui (Radix UI primitives with Tailwind CSS)
- Design system follows Material Design principles with Carbon Design data patterns
- Component library located in `client/src/components/ui/`
- Custom application components in `client/src/components/`

**Styling Approach**:
- Tailwind CSS for utility-first styling
- Custom CSS variables for theme management (light/dark mode support)
- Design tokens defined in `client/src/index.css`
- Typography uses Inter font family via Google Fonts
- Responsive design with mobile-first breakpoints

**State Management**:
- TanStack Query (React Query) for server state management
- Query client configuration in `client/src/lib/queryClient.ts`
- Custom hooks for authentication (`useAuth`) and other features
- Form state managed with React Hook Form and Zod validation

**Routing**: 
- Wouter for client-side routing (lightweight React router)
- Main routes: Dashboard, Users, Analytics, Activity, Configuration
- Protected routes requiring authentication

**Key Pages**:
- Landing page for unauthenticated users
- Dashboard with overview statistics and service status
- User management with CRUD operations
- Analytics visualization using Recharts
- Activity logs for audit trail
- Service configuration for API connections

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Development vs Production**:
- Development: Vite middleware integration for hot module replacement (`server/index-dev.ts`)
- Production: Serves pre-built static assets (`server/index-prod.ts`)

**API Design**:
- RESTful API endpoints defined in `server/routes.ts`
- Route handlers organized by feature (auth, services, users, activity, analytics)
- Middleware for authentication using Replit Auth
- Error handling with appropriate HTTP status codes

**Session Management**:
- Express session with PostgreSQL session store (connect-pg-simple)
- Sessions table in database for persistence
- Cookie-based authentication with httpOnly and secure flags
- 7-day session timeout

**Storage Layer** (`server/storage.ts`):
- Interface-based design for database operations
- Abstracts Drizzle ORM queries
- Operations grouped by entity type (users, services, managed users, activity logs, analytics)
- Supports both authentication user records and managed platform users

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL dialect

**Database Provider**: Neon Serverless PostgreSQL (configured for serverless deployment)

**Schema Design** (`shared/schema.ts`):

1. **sessions**: Express session storage (required for authentication)
2. **users**: Administrator accounts from Replit Auth (stores OIDC user profile data)
3. **serviceConfigs**: API configuration for external platforms (Metabase, Chatwoot, Typebot, Mailcow)
   - Stores API URLs, keys, enabled status
   - Tracks last sync timestamp
4. **managedUsers**: User accounts managed across integrated platforms
   - Email, display name, platform assignments
   - Active/inactive status
   - Creation metadata
5. **activityLogs**: Audit trail for administrative actions
   - Admin user ID, action type, target entity
   - Platform-specific details in JSON field
6. **analyticsMetrics**: Time-series metrics data
   - Platform-specific metric types
   - Timestamp-based for trend analysis

**Migration Strategy**:
- Drizzle Kit for schema migrations
- Migration files stored in `migrations/` directory
- Schema defined in TypeScript, pushed to database via `db:push` script

### Authentication & Authorization

**Authentication Provider**: Dual authentication system
- Replit Auth (OpenID Connect) for production
- Development bypass with team member login (`server/devAuth.ts`)

**RBAC Implementation** (`server/rbac.ts`):
- Three-tier role hierarchy: Technician → Department Admin → Management
- 16 granular permissions covering tasks, departments, users, and analytics
- Role-permission mappings stored in database
- Department-based data segregation

**Roles**:
1. **Management**: Full platform access, cross-department visibility
2. **Department Admin**: Department-scoped access, team management
3. **Technician**: Task execution, limited department access

**Key Permissions**:
- Task management: view_tasks, create_task, update_task, delete_task, assign_task
- Department access: view_own_department, view_all_departments
- User management: manage_department_users, manage_global_users
- Analytics/Logs: view_analytics, view_department_logs, view_all_logs
- Configuration: manage_service_config

**Authorization Middleware**:
- `isAuthenticated`: Basic authentication check
- `isTeamMemberAuthenticated`: Team member with permissions
- `requirePermission`: Single permission enforcement
- `requireAnyPermission`: Any of multiple permissions

**User Flow**:
1. Unauthenticated users see landing page
2. Login via Replit Auth or dev login endpoint
3. Team member record linked to user account
4. Permissions loaded from role-permission mappings
5. Protected routes check authentication and permissions

### External Dependencies

**Third-Party Services**:
- **Metabase**: Business intelligence and analytics platform
- **Chatwoot**: Customer engagement and support platform
- **Typebot**: Conversational forms and chatbot builder
- **Mailcow**: Email server management platform

**Integration Approach**:
- Service configurations stored in `serviceConfigs` table
- API URLs and keys configurable per service
- Enable/disable toggle for each platform
- Last sync tracking for data synchronization
- Future implementation: API clients for each platform to manage users and fetch analytics

**UI Libraries**:
- Radix UI primitives for accessible component foundations
- Recharts for data visualization
- Lucide React for iconography
- date-fns for date formatting
- cmdk for command palette functionality

**Development Tools**:
- TypeScript for type safety
- Vite for fast development builds
- Drizzle Kit for database migrations
- ESBuild for production bundling

**Deployment Platform**:
- Designed for Replit deployment
- Replit-specific plugins for development experience
- Environment variable configuration via `.env`
- PostgreSQL provisioned through Replit

### Build & Deployment

**Scripts**:
- `dev`: Development server with Vite middleware and hot reload
- `build`: Production build (Vite for client, ESBuild for server)
- `start`: Production server serving static assets
- `db:push`: Apply database schema changes

**Static Asset Handling**:
- Client built to `dist/public/`
- Server bundled to `dist/index.js`
- Single-page application with client-side routing
- All routes fall through to `index.html` for client-side navigation

**Environment Requirements**:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session encryption key
- `REPL_ID`: Replit workspace identifier
- `ISSUER_URL`: OIDC provider URL (defaults to Replit)