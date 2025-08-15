# Implementation Guide: Modular Monolith Setup

## Quick Start Implementation

### Step 1: Initialize Project Structure

```bash
# Create directory structure
mkdir -p E:\LCS\CoreApis\CoreApis\src\modules\{attendance,content,doing,giving,membership,messaging}
mkdir -p E:\LCS\CoreApis\CoreApis\src\shared\{auth,base,database,helpers,middleware}
mkdir -p E:\LCS\CoreApis\CoreApis\tools\dbScripts\{attendance,content,doing,giving,membership,messaging}
mkdir -p E:\LCS\CoreApis\CoreApis\config\swagger
```

### Step 2: Create Unified Package.json

```json
{
  "name": "core-api",
  "version": "1.0.0",
  "description": "Unified Church Apps Core API",
  "main": "dist/index.js",
  "scripts": {
    "clean": "rimraf dist",
    "clean-layer": "rimraf layer",
    "build-layer": "mkdir -p layer/nodejs && cp tools/layer-package.json layer/nodejs/package.json && cd layer/nodejs && npm install --production",
    "rebuild-layer": "npm-run-all clean-layer build-layer",
    
    "initdb": "ts-node tools/initdb.ts",
    "initdb:attendance": "ts-node tools/initdb.ts --module attendance",
    "initdb:content": "ts-node tools/initdb.ts --module content",
    "initdb:doing": "ts-node tools/initdb.ts --module doing",
    "initdb:giving": "ts-node tools/initdb.ts --module giving",
    "initdb:membership": "ts-node tools/initdb.ts --module membership",
    "initdb:messaging": "ts-node tools/initdb.ts --module messaging",
    "initdb:all": "npm-run-all initdb:membership initdb:attendance initdb:content initdb:giving initdb:doing initdb:messaging",
    
    "lint": "eslint src --fix && prettier --write src/**/*.ts",
    "tsc": "tsc",
    "build": "npm-run-all clean lint tsc",
    "build-fast": "npm-run-all clean tsc",
    
    "dev": "nodemon --watch src -e ts,ejs --exec \"ts-node src/index.ts\"",
    "dev:debug": "nodemon --watch src -e ts,ejs --exec \"node --inspect=0.0.0.0:9229 -r ts-node/register src/index.ts\"",
    "start": "node dist/index.js",
    
    "deploy-staging": "npm-run-all build build-layer serverless:deploy:staging",
    "deploy-prod": "npm-run-all build build-layer serverless:deploy:prod",
    "serverless:deploy:staging": "serverless deploy --stage staging",
    "serverless:deploy:prod": "serverless deploy --stage prod",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "dependencies": {
    "@churchapps/apihelper": "^0.1.8",
    "@codegenie/serverless-express": "^4.16.0",
    "@hubspot/api-client": "^13.0.0",
    "@aws-sdk/client-apigatewaymanagementapi": "^3.0.0",
    "axios": "^1.10.0",
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dotenv": "^17.0.1",
    "express": "^4.21.2",
    "express-validator": "^7.2.1",
    "firebase-admin": "^12.0.0",
    "inversify": "^6.2.2",
    "inversify-express-utils": "^6.5.0",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.14.1",
    "node-geocoder": "^4.4.1",
    "openai": "^5.9.0",
    "reflect-metadata": "^0.2.2",
    "stripe": "^14.0.0",
    "uuid": "^11.0.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.0",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/node": "^24.0.10",
    "@types/node-geocoder": "^4.2.6",
    "@types/uuid": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.35.1",
    "@typescript-eslint/parser": "^8.35.1",
    "eslint": "^9.30.1",
    "jest": "^29.7.0",
    "nodemon": "^3.1.10",
    "npm-run-all": "^4.1.5",
    "prettier": "^3.6.2",
    "rimraf": "^6.0.1",
    "serverless": "^3.38.0",
    "serverless-plugin-utils": "^0.2.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.3"
  }
}
```

### Step 3: Create Unified Environment Configuration

```typescript
// src/shared/helpers/Environment.ts
import fs from "fs";
import path from "path";
import { EnvironmentBase } from "@churchapps/apihelper";

interface ModuleConfig {
  database: string;
  apiUrl?: string;
}

interface Config {
  appEnv: string;
  appName: string;
  contentRoot: string;
  fileStore: string;
  mailSystem: string;
  s3Bucket: string;
  modules: {
    membership: ModuleConfig;
    attendance: ModuleConfig;
    content: ModuleConfig;
    giving: ModuleConfig;
    messaging: ModuleConfig;
    doing: ModuleConfig;
  };
  // Module API URLs for internal communication
  membershipApi: string;
  attendanceApi: string;
  contentApi: string;
  givingApi: string;
  messagingApi: string;
  doingApi: string;
}

export class Environment extends EnvironmentBase {
  private static config: Config;
  
  // Module database connections
  static databases = new Map<string, string>();
  
  // API endpoints
  static membershipApi: string;
  static attendanceApi: string;
  static contentApi: string;
  static givingApi: string;
  static messagingApi: string;
  static doingApi: string;

  static async init(environment: string) {
    let file = "dev.json";
    if (environment === "staging") file = "staging.json";
    if (environment === "prod") file = "prod.json";

    const relativePath = "../../config/" + file;
    const physicalPath = path.resolve(__dirname, relativePath);

    const json = fs.readFileSync(physicalPath, "utf8");
    this.config = JSON.parse(json);
    
    await this.populateBase(this.config, "coreApi", environment);

    // Initialize module-specific database connections
    Object.entries(this.config.modules).forEach(([module, config]) => {
      this.databases.set(module, config.database);
    });

    // Set API endpoints
    this.membershipApi = this.config.membershipApi;
    this.attendanceApi = this.config.attendanceApi;
    this.contentApi = this.config.contentApi;
    this.givingApi = this.config.givingApi;
    this.messagingApi = this.config.messagingApi;
    this.doingApi = this.config.doingApi;
  }

  static getModuleDatabase(module: string): string {
    const db = this.databases.get(module);
    if (!db) throw new Error(`Database configuration not found for module: ${module}`);
    return db;
  }
}
```

### Step 4: Create Unified Repository Manager

```typescript
// src/shared/database/RepositoryManager.ts
import { Pool } from "@churchapps/apihelper";
import { Environment } from "../helpers/Environment";

// Import all repository classes
import { AttendanceRepositories } from "../../modules/attendance/repositories";
import { ContentRepositories } from "../../modules/content/repositories";
import { DoingRepositories } from "../../modules/doing/repositories";
import { GivingRepositories } from "../../modules/giving/repositories";
import { MembershipRepositories } from "../../modules/membership/repositories";
import { MessagingRepositories } from "../../modules/messaging/repositories";

export class RepositoryManager {
  private static instances = new Map<string, any>();
  private static pools = new Map<string, any>();

  static initializePool(module: string) {
    if (!this.pools.has(module)) {
      const connectionString = Environment.getModuleDatabase(module);
      const pool = Pool.initPool(connectionString);
      this.pools.set(module, pool);
    }
    return this.pools.get(module);
  }

  static getRepositories<T>(module: string): T {
    if (!this.instances.has(module)) {
      this.initializePool(module);
      this.instances.set(module, this.createRepositories(module));
    }
    return this.instances.get(module) as T;
  }

  private static createRepositories(module: string) {
    switch (module) {
      case "attendance":
        return AttendanceRepositories.getCurrent();
      case "content":
        return ContentRepositories.getCurrent();
      case "doing":
        return DoingRepositories.getCurrent();
      case "giving":
        return GivingRepositories.getCurrent();
      case "membership":
        return MembershipRepositories.getCurrent();
      case "messaging":
        return MessagingRepositories.getCurrent();
      default:
        throw new Error(`Unknown module: ${module}`);
    }
  }

  static async closeAll() {
    for (const [module, pool] of this.pools) {
      await pool.end();
    }
    this.pools.clear();
    this.instances.clear();
  }
}
```

### Step 5: Create Module Structure Example (Attendance)

```typescript
// src/modules/attendance/index.ts
export * from "./controllers";
export * from "./models";
export { AttendanceRepositories } from "./repositories/Repositories";

// src/modules/attendance/repositories/Repositories.ts
import {
  AttendanceRepository,
  CampusRepository,
  GroupServiceTimeRepository,
  ServiceRepository,
  ServiceTimeRepository,
  SessionRepository,
  VisitRepository,
  VisitSessionRepository
} from ".";

export class AttendanceRepositories {
  public attendance: AttendanceRepository;
  public campus: CampusRepository;
  public groupServiceTime: GroupServiceTimeRepository;
  public service: ServiceRepository;
  public serviceTime: ServiceTimeRepository;
  public session: SessionRepository;
  public visit: VisitRepository;
  public visitSession: VisitSessionRepository;

  private static _current: AttendanceRepositories = null;
  
  public static getCurrent = () => {
    if (AttendanceRepositories._current === null) {
      AttendanceRepositories._current = new AttendanceRepositories();
    }
    return AttendanceRepositories._current;
  };

  constructor() {
    this.attendance = new AttendanceRepository();
    this.campus = new CampusRepository();
    this.groupServiceTime = new GroupServiceTimeRepository();
    this.service = new ServiceRepository();
    this.serviceTime = new ServiceTimeRepository();
    this.session = new SessionRepository();
    this.visit = new VisitRepository();
    this.visitSession = new VisitSessionRepository();
  }
}

// src/modules/attendance/controllers/AttendanceBaseController.ts
import { CustomBaseController } from "@churchapps/apihelper";
import { RepositoryManager } from "../../../shared/database/RepositoryManager";
import { AttendanceRepositories } from "../repositories/Repositories";

export class AttendanceBaseController extends CustomBaseController {
  public repositories: AttendanceRepositories;

  constructor() {
    super();
    this.repositories = RepositoryManager.getRepositories<AttendanceRepositories>("attendance");
  }
}
```

### Step 6: Create Unified App Configuration

```typescript
// src/app.ts
import "reflect-metadata";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import express from "express";
import cors from "cors";
import { CustomAuthProvider } from "@churchapps/apihelper";

// Import all module bindings
import { attendanceBindings } from "./modules/attendance/inversify.config";
import { contentBindings } from "./modules/content/inversify.config";
import { doingBindings } from "./modules/doing/inversify.config";
import { givingBindings } from "./modules/giving/inversify.config";
import { membershipBindings } from "./modules/membership/inversify.config";
import { messagingBindings } from "./modules/messaging/inversify.config";

export const createApp = async () => {
  const container = new Container();
  
  // Load all module bindings
  await container.loadAsync(attendanceBindings);
  await container.loadAsync(contentBindings);
  await container.loadAsync(doingBindings);
  await container.loadAsync(givingBindings);
  await container.loadAsync(membershipBindings);
  await container.loadAsync(messagingBindings);

  const app = new InversifyExpressServer(
    container,
    null,
    { rootPath: "/api" },
    null,
    CustomAuthProvider
  );

  const configFunction = (expApp: express.Application) => {
    // CORS configuration
    expApp.use(
      cors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
      })
    );

    // Handle preflight requests
    expApp.options("*", (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.sendStatus(200);
    });

    // Body parsing middleware for serverless
    expApp.use((req, res, next) => {
      const contentType = req.headers["content-type"] || "";

      if (Buffer.isBuffer(req.body)) {
        try {
          const bodyString = req.body.toString("utf8");
          if (contentType.includes("application/json")) {
            req.body = JSON.parse(bodyString);
          } else {
            req.body = bodyString;
          }
        } catch {
          req.body = {};
        }
      }
      next();
    });

    // Health check endpoint
    expApp.get("/health", (req, res) => {
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    });

    // Module-specific health checks
    expApp.get("/health/:module", async (req, res) => {
      const module = req.params.module;
      try {
        const repos = RepositoryManager.getRepositories(module);
        res.json({ 
          status: "healthy", 
          module,
          timestamp: new Date().toISOString() 
        });
      } catch (error) {
        res.status(503).json({ 
          status: "unhealthy", 
          module,
          error: error.message 
        });
      }
    });
  };

  return app.setConfig(configFunction).build();
};
```

### Step 7: Create Unified Lambda Handler

```javascript
// lambda.js
const { configure } = require('@codegenie/serverless-express');
const { createApp } = require('./dist/app');
const { RepositoryManager } = require('./dist/shared/database/RepositoryManager');
const { Environment } = require('./dist/shared/helpers/Environment');

let serverlessExpress;

const checkEnvironment = async () => {
  if (!Environment.connectionString) {
    await Environment.init(process.env.APP_ENV);
    // Initialize all module pools
    ['membership', 'attendance', 'content', 'giving', 'messaging', 'doing'].forEach(module => {
      RepositoryManager.initializePool(module);
    });
  }
};

// Main web handler
const web = async function web(event, context) {
  try {
    await checkEnvironment();
    
    if (!serverlessExpress) {
      const app = await createApp();
      serverlessExpress = configure({
        app,
        binarySettings: {
          contentTypes: [
            'application/octet-stream',
            'font/*', 
            'image/*',
            'application/pdf'
          ]
        },
        stripBasePath: false,
        resolutionMode: 'PROMISE'
      });
    }
    
    return serverlessExpress(event, context);
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// WebSocket handler for messaging
const socket = async function socket(event) {
  await checkEnvironment();
  const { SocketHelper } = require('./dist/modules/messaging/helpers/SocketHelper');
  return SocketHelper.handleWebSocket(event);
};

// Timer handlers for messaging
const timer15Min = async function timer15Min(event, context) {
  await checkEnvironment();
  const { NotificationHelper } = require('./dist/modules/messaging/helpers/NotificationHelper');
  return NotificationHelper.sendEmailNotifications("individual");
};

const timerMidnight = async function timerMidnight(event, context) {
  await checkEnvironment();
  const { NotificationHelper } = require('./dist/modules/messaging/helpers/NotificationHelper');
  return NotificationHelper.sendEmailNotifications("daily");
};

module.exports = { web, socket, timer15Min, timerMidnight };
```

### Step 8: Create Development Entry Point

```typescript
// src/index.ts
import dotenv from "dotenv";
import { createApp } from "./app";
import { RepositoryManager } from "./shared/database/RepositoryManager";
import { Environment } from "./shared/helpers/Environment";

dotenv.config();

const port = process.env.SERVER_PORT || 8080;

async function startServer() {
  try {
    // Initialize environment
    await Environment.init(process.env.APP_ENV || "dev");
    
    // Initialize all module database pools
    const modules = ["membership", "attendance", "content", "giving", "messaging", "doing"];
    modules.forEach(module => {
      console.log(`Initializing ${module} database pool...`);
      RepositoryManager.initializePool(module);
    });

    // Create and start app
    const app = await createApp();
    
    app.listen(port, () => {
      console.log(`Core API server running on port ${port}`);
      console.log(`Environment: ${process.env.APP_ENV || "dev"}`);
      console.log(`API Base Path: http://localhost:${port}/api`);
      console.log("\nAvailable modules:");
      modules.forEach(module => {
        console.log(`  - ${module}: http://localhost:${port}/api/${module}`);
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down gracefully...");
      await RepositoryManager.closeAll();
      process.exit(0);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
```

### Step 9: Create Configuration Files

```json
// config/dev.json
{
  "appEnv": "dev",
  "appName": "CoreApi",
  "contentRoot": "http://localhost:8080",
  "fileStore": "disk",
  "mailSystem": "",
  "s3Bucket": "",
  "modules": {
    "membership": {
      "database": "mysql://root:password@localhost/membership_db"
    },
    "attendance": {
      "database": "mysql://root:password@localhost/attendance_db"
    },
    "content": {
      "database": "mysql://root:password@localhost/content_db"
    },
    "giving": {
      "database": "mysql://root:password@localhost/giving_db"
    },
    "messaging": {
      "database": "mysql://root:password@localhost/messaging_db"
    },
    "doing": {
      "database": "mysql://root:password@localhost/doing_db"
    }
  },
  "membershipApi": "http://localhost:8080/api/membership",
  "attendanceApi": "http://localhost:8080/api/attendance",
  "contentApi": "http://localhost:8080/api/content",
  "givingApi": "http://localhost:8080/api/giving",
  "messagingApi": "http://localhost:8080/api/messaging",
  "doingApi": "http://localhost:8080/api/doing"
}
```

### Step 10: Create Database Initialization Script

```typescript
// tools/initdb.ts
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { Environment } from "../src/shared/helpers/Environment";

dotenv.config();

const modules = ["membership", "attendance", "content", "giving", "messaging", "doing"];

async function runScript(connection: mysql.Connection, scriptPath: string) {
  const script = fs.readFileSync(scriptPath, "utf8");
  const statements = script.split(";").filter(s => s.trim().length > 0);
  
  for (const statement of statements) {
    try {
      await connection.query(statement);
    } catch (error) {
      console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
      console.error(error);
    }
  }
}

async function initModule(module: string) {
  console.log(`Initializing ${module} database...`);
  
  const connectionString = Environment.getModuleDatabase(module);
  const connection = await mysql.createConnection(connectionString);
  
  try {
    // Get all SQL files for this module
    const scriptsDir = path.join(__dirname, "dbScripts", module);
    const files = fs.readdirSync(scriptsDir)
      .filter(f => f.endsWith(".mysql"))
      .sort(); // Ensure consistent order
    
    for (const file of files) {
      console.log(`  Running ${file}...`);
      await runScript(connection, path.join(scriptsDir, file));
    }
    
    console.log(`${module} database initialized successfully`);
  } finally {
    await connection.end();
  }
}

async function main() {
  await Environment.init(process.env.APP_ENV || "dev");
  
  // Check command line arguments
  const args = process.argv.slice(2);
  const moduleFlag = args.indexOf("--module");
  
  if (moduleFlag !== -1 && args[moduleFlag + 1]) {
    // Initialize specific module
    const module = args[moduleFlag + 1];
    if (modules.includes(module)) {
      await initModule(module);
    } else {
      console.error(`Unknown module: ${module}`);
      console.log(`Available modules: ${modules.join(", ")}`);
      process.exit(1);
    }
  } else {
    // Initialize all modules
    for (const module of modules) {
      await initModule(module);
    }
  }
  
  console.log("Database initialization complete");
}

main().catch(error => {
  console.error("Database initialization failed:", error);
  process.exit(1);
});
```

## Migration Script Example

```typescript
// tools/migrate-module.ts
import fs from "fs-extra";
import path from "path";

async function migrateModule(moduleName: string, sourcePath: string) {
  const targetPath = path.join(__dirname, "..", "src", "modules", moduleName);
  
  console.log(`Migrating ${moduleName} from ${sourcePath} to ${targetPath}`);
  
  // Copy controllers
  await fs.copy(
    path.join(sourcePath, "src", "controllers"),
    path.join(targetPath, "controllers")
  );
  
  // Copy models
  await fs.copy(
    path.join(sourcePath, "src", "models"),
    path.join(targetPath, "models")
  );
  
  // Copy repositories
  await fs.copy(
    path.join(sourcePath, "src", "repositories"),
    path.join(targetPath, "repositories")
  );
  
  // Copy helpers (if exists)
  const helpersPath = path.join(sourcePath, "src", "helpers");
  if (await fs.pathExists(helpersPath)) {
    await fs.copy(helpersPath, path.join(targetPath, "helpers"));
  }
  
  // Copy database scripts
  await fs.copy(
    path.join(sourcePath, "tools", "dbScripts"),
    path.join(__dirname, "dbScripts", moduleName)
  );
  
  console.log(`${moduleName} migration complete`);
}

// Usage: ts-node tools/migrate-module.ts attendance ../AttendanceApi
const [moduleName, sourcePath] = process.argv.slice(2);
if (moduleName && sourcePath) {
  migrateModule(moduleName, sourcePath).catch(console.error);
} else {
  console.log("Usage: ts-node tools/migrate-module.ts <module-name> <source-path>");
}
```

## Testing Setup

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// Example test file
// src/modules/attendance/__tests__/campus.test.ts
import request from 'supertest';
import { createApp } from '../../../app';
import { Environment } from '../../../shared/helpers/Environment';
import { RepositoryManager } from '../../../shared/database/RepositoryManager';

describe('Campus API', () => {
  let app: Express.Application;
  
  beforeAll(async () => {
    await Environment.init('test');
    app = await createApp();
  });
  
  afterAll(async () => {
    await RepositoryManager.closeAll();
  });
  
  test('GET /api/attendance/campuses should return list', async () => {
    const response = await request(app)
      .get('/api/attendance/campuses')
      .set('Authorization', 'Bearer test-token');
      
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

## Development Workflow

1. **Initial Setup**
   ```bash
   npm install
   cp dotenv.sample.txt .env
   # Edit .env with database credentials
   npm run initdb:all
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Run Tests**
   ```bash
   npm test
   npm run test:watch
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm run build-layer
   ```

5. **Deploy**
   ```bash
   npm run deploy-staging
   npm run deploy-prod
   ```

## Module Communication Examples

```typescript
// Example: Attendance module needs user data from Membership
// src/modules/attendance/helpers/MembershipClient.ts
import axios from 'axios';
import { Environment } from '../../../shared/helpers/Environment';

export class MembershipClient {
  static async getPerson(churchId: string, personId: string, token: string) {
    const response = await axios.get(
      `${Environment.membershipApi}/people/${personId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'churchId': churchId
        }
      }
    );
    return response.data;
  }
}

// Alternative: Direct repository access (if same process)
import { RepositoryManager } from '../../../shared/database/RepositoryManager';
import { MembershipRepositories } from '../../membership/repositories/Repositories';

export class MembershipService {
  static async getPerson(churchId: string, personId: string) {
    const repos = RepositoryManager.getRepositories<MembershipRepositories>('membership');
    return await repos.person.load(churchId, personId);
  }
}
```

This implementation guide provides the foundation for migrating from microservices to a modular monolith while maintaining clean separation between modules.