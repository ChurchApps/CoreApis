import "reflect-metadata";
import express from "express";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { Environment } from "./shared/helpers/Environment";
import { CustomAuthProvider } from "./shared/infrastructure/CustomAuthProvider";
import { RepositoryManager } from "./shared/infrastructure/RepositoryManager";
import cors from "cors";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import { ConnectionManager } from "./shared/infrastructure/ConnectionManager";
import { configureModuleRoutes, moduleRoutingLogger } from "./routes";

export const createApp = async () => {
  // Initialize environment configuration
  const environment = process.env.ENVIRONMENT || process.env.STAGE || "dev";
  await Environment.init(environment);

  // Create main Express app
  const app = express();

  // Configure CORS
  app.use(cors({
    origin: function (origin, callback) {
      const allowedOrigins = Environment.corsOrigin ? Environment.corsOrigin.split(",").map(o => o.trim()) : ["*"];
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
  }));

  // Body parser middleware
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

  // File upload middleware
  app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    useTempFiles: true,
    tempFileDir: "/tmp/"
  }));

  // Module routing logger (for debugging)
  app.use(moduleRoutingLogger);

  // Configure module-specific routes and context middleware
  configureModuleRoutes(app);

  // Load and mount module controllers
  await loadAndMountModules(app);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      environment: Environment.currentEnvironment,
      modules: ["attendance", "content", "doing", "giving", "membership", "messaging"]
    });
  });

  // API documentation endpoint
  app.get("/", (req, res) => {
    res.json({
      name: "Core API",
      version: "1.0.0",
      description: "Modular monolith for church management system",
      modules: {
        attendance: `${Environment.attendanceApi}/attendance`,
        content: `${Environment.contentApi}/content`,
        doing: `${Environment.doingApi}/doing`,
        giving: `${Environment.givingApi}/giving`,
        membership: `${Environment.membershipApi}/membership`,
        messaging: `${Environment.messagingApi}/messaging`
      }
    });
  });

  // Global error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler:", error);
    
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || "Internal Server Error";
    
    res.status(statusCode).json({
      error: {
        message,
        status: statusCode,
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  });

  // 404 handler
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
      error: {
        message: "Endpoint not found",
        status: 404,
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  });

  return app;
};

// Load module bindings and create child apps
async function loadAndMountModules(app: express.Application) {
  const modules = [
    { name: "membership", path: "/membership" },
    { name: "attendance", path: "/attendance" },
    { name: "content", path: "/content" },
    { name: "doing", path: "/doing" },
    { name: "giving", path: "/giving" },
    { name: "messaging", path: "/messaging" }
  ];

  for (const module of modules) {
    try {
      console.log(`Loading ${module.name} module...`);
      
      // Create a container for this module
      const container = new Container();
      
      // Import the module's controllers (they self-register via decorators)
      await import(`./modules/${module.name}/controllers`);
      
      // Create InversifyExpressServer for this module
      const moduleServer = new InversifyExpressServer(
        container,
        null,
        { rootPath: "/" }, // Use root path since we'll mount at module path
        null,
        CustomAuthProvider
      );

      // Build the module app
      const moduleApp = moduleServer.build();
      
      // Mount the module app at its path
      app.use(module.path, moduleApp);
      
      console.log(`✓ ${module.name} module mounted at ${module.path}`);
    } catch (error) {
      console.error(`Failed to load ${module.name} module:`, error);
    }
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log("SIGINT received, closing database connections...");
  await ConnectionManager.closeAll();
  process.exit(0);
});