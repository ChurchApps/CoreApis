import { ConnectionManager } from "./ConnectionManager";
import { Environment } from "../helpers/Environment";
import { DB } from "@churchapps/apihelper";

export class RepositoryManager {
  private static instances: Map<string, any> = new Map();

  static async getRepositories<T>(moduleName: string): Promise<T> {
    if (!this.instances.has(moduleName)) {
      const repositories = await this.createRepositories(moduleName);
      this.instances.set(moduleName, repositories);
    }
    return this.instances.get(moduleName);
  }

  private static async createRepositories(moduleName: string): Promise<any> {
    // Get the pool for this module (DB helper will be managed by individual repositories)
    const pool = await ConnectionManager.getPool(moduleName);

    switch (moduleName) {
      case "attendance":
        const { AttendanceRepositories } = await import("../../modules/attendance");
        return new AttendanceRepositories();

      case "content":
        const { ContentRepositories } = await import("../../modules/content");
        return new ContentRepositories();

      case "doing":
        const { DoingRepositories } = await import("../../modules/doing");
        return new DoingRepositories();

      case "giving":
        const { GivingRepositories } = await import("../../modules/giving");
        return new GivingRepositories();

      case "membership":
        const { MembershipRepositories } = await import("../../modules/membership");
        return new MembershipRepositories();

      case "messaging":
        const { MessagingRepositories } = await import("../../modules/messaging");
        return new MessagingRepositories();

      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  }

  /**
   * Legacy method to support existing getCurrent() pattern
   * For modules that use Repositories.getCurrent(), this provides
   * the same interface while using the shared infrastructure
   */
  static async getCurrentForModule(moduleName: string): Promise<any> {
    return await this.getRepositories(moduleName);
  }

  /**
   * Sets up the database context for a specific module
   * This ensures the correct database connection is used
   */
  static async setupModuleContext(moduleName: string): Promise<void> {
    try {
      // Get database config for this module
      const dbConfig = Environment.getDatabaseConfig(moduleName);
      if (!dbConfig) {
        throw new Error(`Database configuration not found for module: ${moduleName}`);
      }
      
      // Import Pool and EnvironmentBase from @churchapps/apihelper
      const { Pool, EnvironmentBase } = await import("@churchapps/apihelper");
      
      // Set the connection string on EnvironmentBase
      const connectionString = `mysql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port || 3306}/${dbConfig.database}`;
      EnvironmentBase.connectionString = connectionString;
      
      // Set JWT secret from environment
      EnvironmentBase.jwtSecret = process.env.JWT_SECRET || "fallback-jwt-secret-for-development";
      
      // Set other common environment variables
      EnvironmentBase.encryptionKey = process.env.ENCRYPTION_KEY || "";
      
      // Initialize the pool
      Pool.initPool();
      
      console.log(`✅ Successfully initialized Pool and EnvironmentBase for module: ${moduleName}`);
    } catch (error) {
      console.error(`❌ Failed to setup context for module ${moduleName}:`, error);
      throw error;
    }
  }

  static clearCache(moduleName?: string): void {
    if (moduleName) {
      this.instances.delete(moduleName);
    } else {
      this.instances.clear();
    }
  }

  static getCachedModules(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Reinitialize repositories for a module (useful after connection changes)
   */
  static async reinitializeModule(moduleName: string): Promise<void> {
    this.clearCache(moduleName);
    await this.getRepositories(moduleName);
  }
}
