import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // In production, server is compiled to dist/server, and client assets are in dist/public
  // We need to go up one level from dist/server to dist, then into public
  const distPath = path.resolve(__dirname, "..", "public");
  
  console.log(`Debug - Server __dirname: ${__dirname}`);
  console.log(`Debug - Looking for static files in: ${distPath}`);
  console.log(`Debug - Static files directory exists: ${fs.existsSync(distPath)}`);
  
  if (fs.existsSync(distPath)) {
    console.log(`Debug - Contents of ${distPath}:`, fs.readdirSync(distPath));
    
    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send(`
          <html>
            <head><title>Service Temporarily Unavailable</title></head>
            <body>
              <h1>Service Temporarily Unavailable</h1>
              <p>The application is starting up. Please try again in a few moments.</p>
              <p>If this persists, the build may have failed. Check the logs for more information.</p>
            </body>
          </html>
        `);
      }
    });
  } else {
    console.error(`❌ Build directory not found: ${distPath}`);
    console.error(`❌ This usually means the client build failed during deployment.`);
    
    // Serve a temporary error page instead of crashing
    app.use("*", (_req, res) => {
      res.status(503).send(`
        <html>
          <head><title>Build Failed</title></head>
          <body>
            <h1>Application Build Failed</h1>
            <p>The client build failed during deployment.</p>
            <p>Expected build directory: <code>${distPath}</code></p>
            <p>Please check the build logs and redeploy.</p>
            <details>
              <summary>Debugging Information</summary>
              <pre>
Server Directory: ${__dirname}
Expected Build Path: ${distPath}
Directory Exists: ${fs.existsSync(distPath)}
              </pre>
            </details>
          </body>
        </html>
      `);
    });
  }
} 