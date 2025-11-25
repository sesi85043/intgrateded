# Local Development Setup Guide

This guide will help you set up and run the Admin Hub project on your local PC using VS Code.

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v20.x or later)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **PostgreSQL** (v14 or later)
   - Download from: https://www.postgresql.org/download/
   - Verify installation: `psql --version`

3. **VS Code**
   - Download from: https://code.visualstudio.com/

4. **Git** (optional, for cloning)
   - Download from: https://git-scm.com/

## Step 1: Download the Project

### Option A: Export from Replit
1. In your Replit project, click on the three dots menu (⋮)
2. Select "Download as ZIP"
3. Extract the ZIP file to your desired location
4. Open the extracted folder in VS Code

### Option B: Clone from GitHub (if connected)
```bash
git clone <your-repository-url>
cd <project-folder>
code .
```

## Step 2: Install Dependencies

Open the terminal in VS Code (View > Terminal or Ctrl+`) and run:

```bash
npm install
```

This will install all required packages from package.json.

## Step 3: Set Up PostgreSQL Database

### Create a Database

1. Open PostgreSQL command line or use pgAdmin
2. Create a new database:

```sql
CREATE DATABASE admin_hub;
```

3. Note your database connection details:
   - Host: `localhost`
   - Port: `5432` (default)
   - Username: your PostgreSQL username
   - Password: your PostgreSQL password
   - Database: `admin_hub`

## Step 4: Configure Environment Variables

Create a `.env` file in the root of your project:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/admin_hub

# PostgreSQL Connection Details (individual variables)
PGHOST=localhost
PGPORT=5432
PGUSER=your_postgres_username
PGPASSWORD=your_postgres_password
PGDATABASE=admin_hub

# Session Secret (generate a random string)
SESSION_SECRET=your_super_secret_random_string_here_make_it_long_and_random

# Replit Configuration (for local development, use test values)
REPL_ID=local-dev
ISSUER_URL=https://replit.com

# Optional: Development Domain
REPLIT_DEV_DOMAIN=localhost:5000
```

### Important Notes:

- **DATABASE_URL**: Replace `username` and `password` with your PostgreSQL credentials
- **SESSION_SECRET**: Use a long random string. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Authentication**: This project uses Replit Auth. For local development, you'll need to modify the authentication system or set up a test OAuth provider.

## Step 5: Initialize Database Schema

Run the database migration to create all necessary tables:

```bash
npm run db:push
```

You should see output confirming that tables were created:
- sessions
- users
- service_configs
- managed_users
- activity_logs
- analytics_metrics

## Step 6: Run the Development Server

Start the development server:

```bash
npm run dev
```

You should see:
```
[express] serving on port 5000
```

## Step 7: Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

You should see the Admin Hub landing page.

## Authentication Setup for Local Development

**Important:** This project uses Replit Auth (OpenID Connect) which won't work directly on localhost. You have two options:

### Option 1: Mock Authentication (Quick Testing)

Temporarily modify `server/routes.ts` to bypass authentication:

1. Comment out the `isAuthenticated` middleware on routes you want to test
2. Add a mock user to the request object for testing

### Option 2: Set Up Local OAuth (Production-like)

Consider implementing a local authentication provider:
- Auth0 (has a free tier)
- Supabase Auth
- Firebase Auth
- Simple email/password with passport-local

## Project Structure

```
admin-hub/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities and config
│   │   └── App.tsx      # Main app component
│   └── public/          # Static assets
├── server/              # Backend Express application
│   ├── app.ts           # Express app setup
│   ├── routes.ts        # API routes
│   ├── db.ts            # Database connection
│   ├── storage.ts       # Data access layer
│   └── index-dev.ts     # Development server
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schema
└── package.json         # Dependencies
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Database
npm run db:push          # Push schema changes to database

# Type Checking
npm run check            # Run TypeScript type checking

# Production Build
npm run build            # Build for production
npm start                # Run production server
```

## Common Issues & Solutions

### Issue: Port 5000 Already in Use

**Solution:** Kill the process using port 5000 or change the port in `server/app.ts`:

```bash
# Find process on Windows
netstat -ano | findstr :5000

# Find process on Mac/Linux
lsof -i :5000

# Kill the process (use the PID from above)
kill -9 <PID>
```

### Issue: Database Connection Failed

**Solutions:**
1. Verify PostgreSQL is running
2. Check your DATABASE_URL is correct
3. Ensure the database exists: `psql -U postgres -c "CREATE DATABASE admin_hub;"`
4. Test connection: `psql -U postgres -d admin_hub`

### Issue: "relation does not exist" Error

**Solution:** Run the database migration:
```bash
npm run db:push
```

### Issue: npm install fails

**Solutions:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again
4. Make sure you're using Node.js v20 or later

### Issue: TypeScript Errors

**Solution:** Run type checking to see all errors:
```bash
npm run check
```

## VS Code Recommended Extensions

Install these extensions for the best development experience:

1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **TypeScript Vue Plugin (Volar)** - TypeScript support
4. **Tailwind CSS IntelliSense** - Tailwind autocomplete
5. **PostgreSQL** - Database management
6. **REST Client** - API testing

## Development Workflow

1. Make code changes in VS Code
2. Save files (hot reload will update automatically)
3. View changes in browser at `http://localhost:5000`
4. Check terminal for any errors
5. Use browser DevTools for debugging

## Database Management

### View Database Tables

```bash
# Connect to database
psql -U postgres -d admin_hub

# List all tables
\dt

# View table structure
\d table_name

# Query data
SELECT * FROM users;

# Exit psql
\q
```

### Reset Database (if needed)

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE admin_hub;"
psql -U postgres -c "CREATE DATABASE admin_hub;"

# Push schema again
npm run db:push
```

## Next Steps

1. **Configure Service Connections**: Add API credentials for Metabase, Chatwoot, Typebot, and Mailcow in the Configuration page
2. **Set Up Authentication**: Implement a local auth provider for full functionality
3. **Create Test Data**: Add some test users and services to explore the dashboard
4. **Explore Features**: 
   - User Management
   - Analytics Dashboard
   - Activity Logs
   - Service Configuration

## Need Help?

- Check the logs in the terminal for error messages
- Review the browser console (F12) for frontend errors
- Verify environment variables are set correctly
- Ensure PostgreSQL is running and accessible

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Vite Documentation](https://vitejs.dev/)

---

**Happy Coding!** If you run into any issues, review the troubleshooting section above or check the application logs for specific error messages.
