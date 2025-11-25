# Quick Start: Running Admin Hub Locally

## ✅ What I Just Set Up For You

I've implemented **Development Bypass Authentication** - the fastest way to test the app locally!

## 🚀 How to Use It

### On Replit (Right Now)

**Just click this link to login:**
👉 Visit: `/api/dev-login` (or click the "Sign In" button and it will redirect you)

You'll be instantly logged in as:
- **Email:** admin@localhost.dev
- **Name:** Admin User

### On Your Local PC (VS Code)

Follow these steps:

#### 1. Download the Project
- Click the three dots (⋮) in Replit
- Select "Download as ZIP"
- Extract to your desired folder
- Open in VS Code

#### 2. Set Up Database

Install PostgreSQL, then create the database:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE admin_hub;"

# Create .env file with your database credentials
```

Create `.env` file:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/admin_hub
SESSION_SECRET=your-random-secret-string-here
NODE_ENV=development
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Initialize Database

```bash
npm run db:push
```

#### 5. Start the App

```bash
npm run dev
```

#### 6. Login

Open browser to: `http://localhost:5000/api/dev-login`

**That's it!** You're logged in and can use the dashboard.

## 🎯 What Changed

I modified the app to use simple development authentication instead of Replit Auth:

1. **Created:** `server/devAuth.ts` - Development authentication module
2. **Modified:** `server/routes.ts` - Now uses devAuth instead of replitAuth

## 📝 Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/dev-login` | Auto-login (instant access) |
| `/api/auth/user` | Get current user info |
| `/api/logout` | Logout |
| `/` | Dashboard (requires login) |

## 🔄 Switching Between Dev and Production

When you want to deploy to Replit with real authentication:

1. Open `server/routes.ts`
2. Change line 5 from:
   ```typescript
   import { setupAuth, isAuthenticated } from "./devAuth";
   ```
   To:
   ```typescript
   import { setupAuth, isAuthenticated } from "./replitAuth";
   ```

## ⚡ Quick Test on Replit

Try these URLs right now on Replit:

1. **Login:** Click "Sign In" or visit `/api/dev-login`
2. **Check User:** Visit `/api/auth/user` (should show your user data)
3. **Dashboard:** Visit `/` (should show the admin dashboard)

## 🐛 Troubleshooting

### "Unauthorized" error
- **Solution:** Visit `/api/dev-login` first to create your session

### Can't access dashboard
- **Solution:** Clear your browser cookies and visit `/api/dev-login` again

### Database errors
- **Solution:** Run `npm run db:push` to create tables

### Port 5000 in use (local PC)
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

## 🎨 Development Workflow

1. Make code changes in VS Code
2. Save (auto-reload happens)
3. Refresh browser
4. Test features

## 📦 What's Included

This dev auth setup includes:
- ✅ Auto-login endpoint
- ✅ Session management
- ✅ User creation in database
- ✅ Compatible with all existing API routes
- ✅ Works on Replit AND local PC

## 🔐 Security Note

**This is for development only!** 

For production:
- Use the real Replit Auth (already configured)
- Or implement OAuth (Google, GitHub, etc.)
- Or use Auth0/Supabase/Firebase

## Next Steps

Now that you're logged in, you can:

1. ✨ Add service configurations (Metabase, Chatwoot, etc.)
2. 👥 Create and manage users
3. 📊 View analytics
4. 📝 Check activity logs
5. ⚙️ Configure platform settings

## Need More Help?

- See `AUTH_SETUP_GUIDE.md` for other authentication options
- See `SETUP.md` for full local development setup
- Check the logs if something goes wrong

**Happy coding!** 🎉
