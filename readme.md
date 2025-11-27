# Admin Hub - Staff Onboarding Application

## Overview
Admin Hub is an Express + React application that provides a unified management platform with role-based access control (RBAC). The platform includes staff onboarding with a comprehensive registration workflow, approval system, and permission management.

## Project Structure
```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utility functions
│       └── pages/          # Page components
├── server/                 # Express backend
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database operations
│   ├── devAuth.ts         # Development authentication
│   └── index.ts           # Server entry point
└── shared/
    └── schema.ts          # Drizzle ORM schema definitions
```

## Recent Changes
- **Staff Registration System** (Nov 2025)
  - Multi-step registration form with extended data collection
  - Residential address and two next-of-kin contacts
  - Simple math CAPTCHA verification
  - Pending registration workflow with admin approval
  - OTP-based approval verification
  - Role assignment upon activation

## Key Features

### Role-Based Access Control (RBAC)
Three role types with hierarchical permissions:
- **MANAGEMENT**: Full system access, can approve registrations
- **DEPARTMENT_ADMIN**: Department-level management
- **TECHNICIAN**: Task-focused access

### Staff Onboarding Workflow
1. New staff fills multi-step registration form
2. Application stored as pending registration
3. Management receives notification with OTP
4. Management reviews and approves/rejects with OTP verification
5. On approval, team member account is created with assigned role

### Database Schema
Key tables:
- `team_members`: Staff accounts with extended profile data
- `pending_registrations`: Pending staff applications
- `approval_otps`: One-time passwords for approval verification
- `admin_notifications`: System notifications for admins
- `roles` & `permissions`: RBAC system tables

## API Endpoints

### Authentication
- `POST /api/auth/login` - Staff login
- `POST /api/auth/register` - New staff registration
- `POST /api/auth/logout` - Logout

### Registrations (Management Only)
- `GET /api/registrations` - List all pending registrations
- `POST /api/registrations/:id/generate-otp` - Generate approval OTP
- `POST /api/registrations/:id/approve` - Approve with OTP
- `POST /api/registrations/:id/reject` - Reject with reason

### Public
- `GET /api/public/departments` - List departments for registration

## User Preferences
- Dark/light theme toggle available
- Mobile-responsive design

## Development Notes
- Server runs on port 5000 
- Development auth uses devAuth.ts with session-based authentication
- Production should use replitAuth for proper authentication
- Database: PostgreSQL via Drizzle ORM

## Demo Accounts
- **Management**: admin@company.com / admin123
- **Dept Admin**: ha.admin@company.com / admin123
- **Technician**: ha.tech1@company.com / admin123
