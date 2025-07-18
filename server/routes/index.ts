import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerCampaignRoutes } from "./campaigns.js";
import { registerVoiceRoutes } from "./voices.js";
import { registerUploadRoutes } from "./uploads.js";
import { registerAgentRoutes } from "./agent.js";
import { registerCallRoutes } from "./calls.js";
import { registerAnalyticsRoutes } from "./analytics.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all route modules
  registerCampaignRoutes(app);
  registerVoiceRoutes(app);
  registerUploadRoutes(app);
  registerAgentRoutes(app);
  registerCallRoutes(app);
  registerAnalyticsRoutes(app);

  // Create HTTP server for WebSocket support
  const server = createServer(app);

  return server;
} 