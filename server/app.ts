import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";
import cors from 'cors';
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

// Optional CORS configuration to allow frontend on a different origin to
// set cookies via `credentials: include`. Configure via CORS_ORIGIN (comma separated list).
const corsOrigin = process.env.CORS_ORIGIN?.trim();
const defaultOrigins = [
  'http://158.220.107.106:8080',
  'http://158.220.107.106:5000',
  'http://localhost:5000',
  'http://localhost:8080',
];
const origins = corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : defaultOrigins;
console.log('[auth] CORS allowed origins:', origins);
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl / Postman) as well
    if (!origin || origins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
} as any));

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
  // fallback to other error handlers
  return _next(err);
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
