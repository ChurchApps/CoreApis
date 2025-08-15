import fs from "fs";
import path from "path";
import { AwsHelper, EnvironmentBase } from "@churchapps/apihelper";

export class Environment extends EnvironmentBase {
  // Current environment and server configuration
  static currentEnvironment: string;
  static port: number;
  static socketUrl: string;

  // API URLs for modules
  static membershipApi: string;
  static attendanceApi: string;
  static contentApi: string;
  static givingApi: string;
  static messagingApi: string;
  static doingApi: string;

  // Database connections per module
  static dbConnections: Map<string, any> = new Map();

  // Membership API specific
  static jwtExpiration: string;
  static emailOnRegistration: boolean;
  static supportEmail: string;
  static chumsRoot: string;
  static hubspotKey: string;
  static caddyHost: string;
  static caddyPort: string;

  // Content API specific
  static youTubeApiKey: string;
  static pexelsKey: string;
  static vimeoToken: string;
  static apiBibleKey: string;
  static praiseChartsConsumerKey: string;
  static praiseChartsConsumerSecret: string;

  // Giving API specific
  static googleRecaptchaSecretKey: string;

  // AI provider configuration (shared across multiple modules)
  static aiProvider: string;
  static openRouterApiKey: string;
  static openAiApiKey: string;

  // WebSocket configuration
  static websocketUrl: string;
  static websocketPort: number;

  // File storage configuration
  static fileStore: string;
  static s3Bucket: string;
  static contentRoot: string;

  // Delivery provider
  static deliveryProvider: string;

  static async init(environment: string) {
    let file = "dev.json";
    if (environment === "demo") file = "demo.json";
    if (environment === "staging") file = "staging.json";
    if (environment === "prod") file = "prod.json";

    // In Lambda, __dirname is /var/task/dist/src/shared/helpers
    // Config files are at /var/task/config
    let physicalPath: string;

    // Check if we're in actual Lambda (not serverless-local)
    const isActualLambda = process.env.AWS_LAMBDA_FUNCTION_NAME && __dirname.startsWith("/var/task");

    if (isActualLambda) {
      // In Lambda, config is at root level
      physicalPath = path.resolve("/var/task/config", file);
    } else {
      // In local development, resolve from the project root
      const projectRoot = path.resolve(__dirname, "../../../");
      physicalPath = path.resolve(projectRoot, "config", file);
    }

    const json = fs.readFileSync(physicalPath, "utf8");
    const data = JSON.parse(json);
    await this.populateBase(data, "coreApi", environment);

    // Set current environment and server config
    this.currentEnvironment = environment;
    this.port = data.port || 8082;
    this.socketUrl = data.websocket?.url || this.websocketUrl || "ws://localhost:8087";

    // Initialize module-specific configs
    this.initializeModuleConfigs(data);

    // Initialize database connections
    this.initializeDatabaseConnections(data);

    // Initialize app configurations
    await this.initializeAppConfigs(data, environment);
  }

  private static initializeModuleConfigs(config: any) {
    // These can be overridden in monolith for internal calls
    this.membershipApi = config.membershipApi || config.apiUrl;
    this.attendanceApi = config.attendanceApi || config.apiUrl;
    this.contentApi = config.contentApi || config.apiUrl;
    this.givingApi = config.givingApi || config.apiUrl;
    this.messagingApi = config.messagingApi || config.apiUrl;
    this.doingApi = config.doingApi || config.apiUrl;
  }

  private static initializeDatabaseConnections(config: any) {
    if (config.databases) {
      for (const [moduleName, dbConfig] of Object.entries(config.databases)) {
        this.dbConnections.set(moduleName, dbConfig);
      }
    } else {
      // Fallback for legacy config format
      if (config.database) {
        this.dbConnections.set("membership", config.database);
      }
    }
  }

  private static async initializeAppConfigs(config: any, environment: string) {
    // WebSocket configuration
    this.websocketUrl = config.websocket?.url || "ws://localhost:8087";
    this.websocketPort = config.websocket?.port || 8087;

    // File storage configuration
    this.fileStore = config.fileStore || "disk";
    this.s3Bucket = config.s3Bucket || "";
    this.contentRoot = config.contentRoot || "/content/";
    this.deliveryProvider = config.deliveryProvider || "local";

    // Membership API specific
    this.jwtExpiration = "2 days";
    this.emailOnRegistration = config.emailOnRegistration;
    this.supportEmail = config.supportEmail;
    this.chumsRoot = config.chumsRoot;

    // AWS Parameter Store values (async)
    this.hubspotKey = process.env.HUBSPOT_KEY || (await AwsHelper.readParameter(`/${environment}/hubspotKey`));
    this.caddyHost = process.env.CADDY_HOST || (await AwsHelper.readParameter(`/${environment}/caddyHost`));
    this.caddyPort = process.env.CADDY_PORT || (await AwsHelper.readParameter(`/${environment}/caddyPort`));

    // Content API specific
    this.youTubeApiKey = process.env.YOUTUBE_API_KEY || (await AwsHelper.readParameter(`/${environment}/youTubeApiKey`));
    this.pexelsKey = process.env.PEXELS_KEY || (await AwsHelper.readParameter(`/${environment}/pexelsKey`));
    this.vimeoToken = process.env.VIMEO_TOKEN || (await AwsHelper.readParameter(`/${environment}/vimeoToken`));
    this.apiBibleKey = process.env.API_BIBLE_KEY || (await AwsHelper.readParameter(`/${environment}/apiBibleKey`));
    this.praiseChartsConsumerKey = process.env.PRAISECHARTS_CONSUMER_KEY || (await AwsHelper.readParameter(`/${environment}/praiseChartsConsumerKey`));
    this.praiseChartsConsumerSecret = process.env.PRAISECHARTS_CONSUMER_SECRET || (await AwsHelper.readParameter(`/${environment}/praiseChartsConsumerSecret`));

    // Giving API specific
    this.googleRecaptchaSecretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY || (await AwsHelper.readParameter(`/${environment}/recaptcha-secret-key`));

    // AI provider configuration (shared)
    this.aiProvider = config.aiProvider;
    this.openRouterApiKey = process.env.OPENROUTER_API_KEY || (await AwsHelper.readParameter(`/${environment}/openRouterApiKey`));
    this.openAiApiKey = process.env.OPENAI_API_KEY || (await AwsHelper.readParameter(`/${environment}/openAiApiKey`));
  }

  static getDatabaseConfig(moduleName: string): any {
    return this.dbConnections.get(moduleName);
  }

  static getAllDatabaseConfigs(): Map<string, any> {
    return this.dbConnections;
  }
}