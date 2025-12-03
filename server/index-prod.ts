import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Server } from "node:http";

import express, { type Express } from "express";
import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
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
