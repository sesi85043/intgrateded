import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  // Get directory path from process.cwd() since import.meta won't work in bundled CJS
  const __dirname = path.resolve(process.cwd());
  
  const distPath = path.resolve(__dirname, "public");
  
  console.log(`[static] Looking for static files at: ${distPath}`);
  console.log(`[static] Current directory: ${process.cwd()}`);
  console.log(`[static] __dirname: ${__dirname}`);

  if (!fs.existsSync(distPath)) {
    console.error(`[static] Directory not found: ${distPath}`);
    console.error(`[static] Available files in parent:`, fs.readdirSync(path.dirname(distPath)));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const files = fs.readdirSync(distPath);
  console.log(`[static] Found ${files.length} items in public directory:`, files);

  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
  }));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

(async () => {
  await runApp(serveStatic);
})();

// Add process-level handlers to log unhandled errors and rejections.
// Avoid crashing silently or rethrowing errors that bubble up.
process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught Exception:', err && (err.stack || err));
  // For now we do not exit immediately; pm2 or the orchestrator will handle restarts.
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[process] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Optionally add logic to notify or gracefully shutdown. Keep the process alive to avoid 502s.
});
