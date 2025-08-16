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

  // Create Inversify container
  const container = new Container();

  // Load module bindings and controllers
  await loadModuleBindings(container);

  // Create Express server with Inversify
  const server = new InversifyExpressServer(container, null, { rootPath: "" }, null, CustomAuthProvider);

  // Configure the server
  server.setConfig((app) => {
    // Configure CORS
    app.use(
      cors({
        origin: function (origin, callback) {
          const allowedOrigins = Environment.corsOrigin
            ? Environment.corsOrigin.split(",").map((o) => o.trim())
            : ["*"];
          if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
      })
    );

    // Body parser middleware
    app.use(bodyParser.json({ limit: "50mb" }));
    app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

    // File upload middleware
    app.use(
      fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
        useTempFiles: true,
        tempFileDir: "/tmp/"
      })
    );

    // Module routing logger (for debugging)
    app.use(moduleRoutingLogger);

    // Configure module-specific routes and context middleware
    configureModuleRoutes(app);

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
  });

  server.setErrorConfig((app) => {
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
  });

  return server.build();
};

async function loadModuleBindings(container: Container) {
  try {
    console.log("Loading module controllers and bindings...");

    // Load all module controllers which will self-register via decorators
    // The @controller decorators automatically register with the container

    // Import membership module controllers with proper prefix
    await import("./modules/membership/controllers");
    console.log("✓ Membership controllers loaded");

    // Import attendance module controllers
    await import("./modules/attendance/controllers");
    console.log("✓ Attendance controllers loaded");

    // Import content module controllers
    await import("./modules/content/controllers");
    console.log("✓ Content controllers loaded");

    // Import doing module controllers
    await import("./modules/doing/controllers");
    console.log("✓ Doing controllers loaded");

    // Import giving module controllers
    await import("./modules/giving/controllers");
    console.log("✓ Giving controllers loaded");

    // Import messaging module controllers
    await import("./modules/messaging/controllers");
    console.log("✓ Messaging controllers loaded");

    // Set up repository manager as singleton
    container.bind<RepositoryManager>("RepositoryManager").toConstantValue(RepositoryManager);

    console.log("All module bindings loaded successfully");
  } catch (error) {
    console.error("Failed to load module bindings:", error);
    throw error;
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log("SIGINT received, closing database connections...");
  await ConnectionManager.closeAll();
  process.exit(0);
});
