# Authentication Setup Guide for Local Development

This guide provides multiple solutions for handling authentication when running the Admin Hub locally on your PC.

## The Challenge

This project uses **Replit Auth** (OpenID Connect), which only works on Replit's platform. When running locally, you need an alternative authentication method.

## Solution Options

Choose one of these approaches based on your needs:

---

## Option 1: Development Bypass (Quick Testing) ⚡

**Best for:** Testing features quickly without worrying about auth  
**Time:** 5 minutes  
**Security:** NOT for production!

### Step 1: Create a Development Auth File

Create a new file `server/devAuth.ts`:

```typescript
import type { Express, RequestHandler } from "express";
import session from "express-session";

// Mock user for development
const DEV_USER = {
  id: "dev-user-123",
  email: "admin@localhost.dev",
  firstName: "Admin",
  lastName: "User",
  profileImageUrl: null,
};

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for localhost
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());

  // Auto-login route for development
  app.get("/api/dev-login", (req: any, res) => {
    req.session.user = DEV_USER;
    res.redirect("/");
  });

  // Mock auth user endpoint
  app.get("/api/auth/user", (req: any, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // Mock logout
  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.session?.user) {
    // Attach user to request for compatibility
    req.user = { claims: { sub: req.session.user.id } };
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
```

### Step 2: Update server/routes.ts

At the top of `server/routes.ts`, change the import:

```typescript
// Comment out the Replit Auth import
// import { setupAuth, isAuthenticated } from "./replitAuth";

// Use dev auth instead
import { setupAuth, isAuthenticated } from "./devAuth";
```

### Step 3: Create Test User in Database

Run this SQL to create a test user (optional but recommended):

```bash
psql -U postgres -d admin_hub
```

```sql
INSERT INTO users (id, email, first_name, last_name) 
VALUES ('dev-user-123', 'admin@localhost.dev', 'Admin', 'User')
ON CONFLICT (id) DO NOTHING;
```

Or just run:
```bash
npm run dev
```

And visit `http://localhost:5000/api/dev-login` - this will create your session automatically.

### Step 4: Test It

1. Start the server: `npm run dev`
2. Visit: `http://localhost:5000/api/dev-login`
3. You'll be redirected to the dashboard, logged in!

**✅ Pros:**
- Fast setup
- No external dependencies
- Easy to test features

**❌ Cons:**
- No real security
- No login UI
- Don't use in production!

---

## Option 2: Simple Local Auth with Email/Password 🔐

**Best for:** More realistic local development with proper login flow  
**Time:** 30 minutes  
**Security:** Good for local testing

### Step 1: Install passport-local

Already installed! It's in your package.json.

### Step 2: Create Local Auth File

Create `server/localAuth.ts`:

```typescript
import type { Express, RequestHandler } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { storage } from "./storage";

// Simple password hashing (use bcrypt in production!)
function hashPassword(password: string): string {
  // For development only - use bcrypt in production
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function getSession() {
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

export async function setupAuth(app: Express) {
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport-local
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          // For development: accept any email with password "admin123"
          if (password === "admin123") {
            // Get or create user
            let user = await storage.getUserByEmail(email);
            
            if (!user) {
              // Create new user
              const newUser = await storage.upsertUser({
                id: `local-${Date.now()}`,
                email,
                firstName: email.split("@")[0],
                lastName: "User",
              });
              user = newUser;
            }

            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Login endpoint
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ success: true, user: req.user });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // Logout
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    // Make compatible with Replit Auth format
    const user = req.user as any;
    (req as any).user = {
      claims: { sub: user.id },
      ...user,
    };
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
```

### Step 3: Add getUserByEmail to Storage

Edit `server/storage.ts` and add this method to the `IStorage` interface:

```typescript
getUserByEmail(email: string): Promise<User | null>;
```

Then implement it in the `MemStorage` or database storage class:

```typescript
async getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user || null;
}
```

### Step 4: Create Login UI Component

Create `client/src/components/LoginForm.tsx`:

```typescript
import { useState } from "react";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (response.ok) {
        toast({ title: "Login successful!" });
        navigate("/");
        window.location.reload(); // Refresh to load user data
      } else {
        toast({
          title: "Login failed",
          description: "Invalid email or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                data-testid="input-password"
              />
              <p className="text-xs text-muted-foreground">
                Development mode: Use password "admin123"
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 5: Update Landing Page

Edit `client/src/pages/landing.tsx` to show the login form:

```typescript
import { LoginForm } from "@/components/LoginForm";

export default function Landing() {
  return <LoginForm />;
}
```

### Step 6: Update routes.ts

Change the import at the top:

```typescript
// import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupAuth, isAuthenticated } from "./localAuth";
```

### Step 7: Test It

1. Start server: `npm run dev`
2. Visit: `http://localhost:5000`
3. Enter any email and password: `admin123`
4. You're logged in!

**✅ Pros:**
- Realistic login flow
- Works like production
- Can test login/logout

**❌ Cons:**
- Simple password (not secure)
- Still need real auth for production

---

## Option 3: Environment-Based Auth Switching 🔄

**Best for:** Switching between local and Replit easily  
**Time:** 10 minutes (after setting up Option 1 or 2)

### Create an Auth Router

Create `server/auth.ts`:

```typescript
export function getAuthModule() {
  if (process.env.NODE_ENV === "development" && !process.env.REPL_ID) {
    // Local development
    console.log("🔧 Using local development auth");
    return require("./localAuth"); // or "./devAuth"
  } else {
    // Replit production
    console.log("🔐 Using Replit Auth");
    return require("./replitAuth");
  }
}

export const { setupAuth, isAuthenticated, getSession } = getAuthModule();
```

### Update routes.ts

```typescript
import { setupAuth, isAuthenticated } from "./auth";
```

Now it automatically uses the right auth based on your environment!

---

## Quick Reference

| Method | Setup Time | Best For | Security |
|--------|-----------|----------|----------|
| Development Bypass | 5 min | Quick testing | Low |
| Local Auth | 30 min | Realistic dev | Medium |
| Environment Switch | 10 min | Both local & Replit | Varies |

## Recommended Approach

1. **Start with Development Bypass** (Option 1) - Get up and running fast
2. **Upgrade to Local Auth** (Option 2) - When you need proper login flow
3. **Add Environment Switching** (Option 3) - To easily deploy to Replit

## Testing Your Setup

After setting up auth, test these endpoints:

```bash
# Check if auth is working
curl http://localhost:5000/api/auth/user

# Should return 401 Unauthorized if not logged in
# Should return user data if logged in
```

## Troubleshooting

### "Unauthorized" errors

- For Option 1: Visit `/api/dev-login` first
- For Option 2: Make sure you logged in at `/`
- Check browser console for errors

### Session not persisting

- Make sure SESSION_SECRET is set in `.env`
- Check cookie settings (secure: false for localhost)
- Clear browser cookies and try again

### Database errors

- Make sure you ran `npm run db:push`
- Check DATABASE_URL is correct
- Verify PostgreSQL is running

## Next Steps

Once you have auth working:

1. Create some test users
2. Test the dashboard features
3. Configure your platform services
4. Build your admin workflows!

## Need Help?

- Check server logs for errors
- Verify environment variables
- Make sure all files are in the right place
- Test with curl or Postman first

---

Remember: These are **development solutions**. For production, use proper authentication with:
- OAuth providers (Google, GitHub)
- Auth0, Supabase, or Firebase
- Proper password hashing (bcrypt)
- HTTPS and secure cookies
