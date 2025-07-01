import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./auth.js";
import authRoutes from "./auth-routes.js";
import { Pool } from "pg";

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('Debug - Loading .env from:', envPath);
console.log('Debug - .env file exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  try {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
    console.log('Debug - Loaded environment variables:', Object.keys(process.env));
    console.log('Debug - ELEVENLABS_API_KEY exists:', !!process.env.ELEVENLABS_API_KEY);
    console.log('Debug - ELEVENLABS_API_KEY length:', process.env.ELEVENLABS_API_KEY?.length);
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
} else {
  console.error('No .env file found at:', envPath);
}

// Set BASE_URL from Railway domain if not provided
if (!process.env.BASE_URL && process.env.RAILWAY_PUBLIC_DOMAIN) {
  process.env.BASE_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

// Validate required environment variables
const requiredEnvVars = ['ELEVENLABS_API_KEY', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'DATABASE_URL', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please add the following to your .env file:');
  if (missingEnvVars.includes('SESSION_SECRET')) {
    console.error('SESSION_SECRET=your-super-secret-session-key-here');
  }
  process.exit(1);
}

// Log BASE_URL for debugging
console.log('BASE_URL configured as:', process.env.BASE_URL);

const app = express();

// Trust proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const PgSession = connectPgSimple(session);

// Create a proper Pool instance for session store
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
});

app.use(session({
  store: new PgSession({
    pool: sessionPool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  name: 'voice-caller-session',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send cookies over HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict', // CSRF protection
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
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

// Authentication routes
app.use('/api/auth', authRoutes);

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Global error handler:', err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use Railway's PORT environment variable or fallback to 5000
  const port = parseInt(process.env.PORT || "5000", 10);
  
  // Railway requires binding to 0.0.0.0, not 127.0.0.1
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  
  server.listen({
    port,
    host
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();
