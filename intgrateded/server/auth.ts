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

const auth = await loadAuthModule();

export const setupAuth = (auth && (auth.setupAuth || auth.default?.setupAuth || auth.setupAuth)) || ((app: any) => {});
export const isAuthenticated = (auth && (auth.isAuthenticated || auth.default?.isAuthenticated)) || ((req: any, res: any, next: any) => next());
export const isTeamMemberAuthenticated = (auth && (auth.isTeamMemberAuthenticated || auth.default?.isTeamMemberAuthenticated || auth.isAuthenticated)) || ((req: any, res: any, next: any) => next());
export const getSession = (auth && (auth.getSession || auth.default?.getSession)) || (() => { throw new Error('getSession not available in selected auth module'); });

export default auth;
