import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";
import cors from 'cors';

import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

// trust proxy so secure cookies and forwarded headers are handled correctly
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// CORS configuration
// CORS_ORIGIN env var: comma-separated list of allowed origins, or '*' for all
// In development or Replit environments, all origins are allowed by default
const isDev = process.env.NODE_ENV === 'development';
const isReplit = !!(process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN);
const corsOrigin = process.env.CORS_ORIGIN?.trim();

// Allow all origins if: development mode, Replit, or CORS_ORIGIN is set to '*'
const allowAllOrigins = isDev || isReplit || corsOrigin === '*';

// Parse CORS_ORIGIN as comma-separated list if provided
const allowedOrigins = corsOrigin && corsOrigin !== '*' 
  ? corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
  : [];

console.log('[CORS] Config:', {
  allowAllOrigins,
  allowedOrigins: allowAllOrigins ? 'ALL' : allowedOrigins,
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: corsOrigin || '(not set)',
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in dev/Replit mode or when CORS_ORIGIN=*
    if (allowAllOrigins) {
      return callback(null, true);
    }
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin) {
      return callback(null, true);
    }
    // Check against allowed origins list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Reject unknown origins
    console.warn(`[CORS] Rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Debug middleware to log Set-Cookie for successful auth endpoints for easier debugging
app.use((req, res, next) => {
  // only attach to auth login and callback paths
  if (req.path === '/api/auth/login' || req.path === '/api/callback') {
    const originalSend = res.send;
    res.send = function (body: any) {
      const cookie = res.getHeader('set-cookie');
      console.log(`[auth] set-cookie header for ${req.path}:`, cookie);
      return originalSend.call(this, body);
    } as any;
  }
  next();
});

// Body parser JSON error handler - produce a friendly 400 instead of crashing
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.warn('[express] JSON parse error:', err.message);
      return res.status(400).json({ message: 'Malformed JSON in request body' });
    }
    // fallback to other error handlers - log and return a safe response instead
    console.error('[express] Uncaught error in request handler:', err && err.stack ? err.stack : err);
    try {
      // avoid crashing the process from an unhandled error here by responding with a 500
      return res.status(500).json({ message: 'Internal Server Error' });
    } catch (sendErr) {
      console.error('[express] Failed sending error response', sendErr);
      // If sending the response fails, just return next to avoid rethrowing
      return _next(sendErr);
    }
  });

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('[express] Global error handler responding:', { status, message, stack: err && err.stack });
    res.status(status).json({ message });
    // Do not rethrow - keep the server alive and let the container/pm2 handle restarts if necessary
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
}
