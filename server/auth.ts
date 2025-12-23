// Environment-based auth router: picks the right auth implementation
// Exports: setupAuth(app), isAuthenticated, isTeamMemberAuthenticated, getSession
// Use dynamic import with top-level await so this module works under ESM
async function loadAuthModule() {
  try {
    // STANDALONE_ID / ISSUER_URL = use OIDC standalone auth
    if (process.env.STANDALONE_ID || process.env.ISSUER_URL) {
      const mod = await import("./standaloneAuth");
      return (mod as any).default || mod;
    }

    // In development mode, use devAuth for password-based login
    // This takes priority over Replit OIDC auth in development
    if (process.env.NODE_ENV === "development") {
      const mod = await import("./devAuth");
      return (mod as any).default || mod;
    }

    // If running on Replit, use Replit OIDC auth
    if (process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN) {
      const mod = await import("./replitAuth");
      return (mod as any).default || mod;
    }

    // VPS / self-hosted production: Use devAuth for password-based login
    // This runs when NODE_ENV=production but we're not on Replit and no OIDC provider is configured
    if (process.env.NODE_ENV === "production") {
      console.log('[auth] Production mode without Replit/OIDC detected - using password-based auth (devAuth)');
      const mod = await import("./devAuth");
      return (mod as any).default || mod;
    }

    // Fallback order
    try {
      const mod = await import("./replitAuth");
      return (mod as any).default || mod;
    } catch (e) {
      try {
        const mod = await import("./standaloneAuth");
        return (mod as any).default || mod;
      } catch (e2) {
        const mod = await import("./devAuth");
        return (mod as any).default || mod;
      }
    }
  } catch (err) {
    const mod = await import("./devAuth");
    return (mod as any).default || mod;
  }
}

let auth: any = null;

async function initAuth() {
  if (!auth) {
    auth = await loadAuthModule();
  }
  return auth;
}

export const setupAuth = async (app: any) => {
  // Initialize auth module if not already done
  if (!auth) {
    await initAuth();
  }
  
  // Call the auth module's setupAuth function
  if (auth && auth.setupAuth) {
    return await auth.setupAuth(app);
  } else if (auth && auth.default && auth.default.setupAuth) {
    return await auth.default.setupAuth(app);
  } else {
    console.warn('[auth] No setupAuth function found in loaded auth module');
  }
};

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!auth) {
    return next();
  }
  const fn = auth.isAuthenticated || auth.default?.isAuthenticated;
  return fn ? fn(req, res, next) : next();
};

export const isTeamMemberAuthenticated = (req: any, res: any, next: any) => {
  if (!auth) {
    return next();
  }
  const fn = auth.isTeamMemberAuthenticated || auth.default?.isTeamMemberAuthenticated || auth.isAuthenticated;
  return fn ? fn(req, res, next) : next();
};

export const getSession = () => {
  if (!auth) {
    throw new Error('Auth not initialized');
  }
  return auth.getSession || auth.default?.getSession;
};

export { initAuth };
export default { initAuth };
