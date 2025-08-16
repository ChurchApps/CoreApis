import { CustomAuthProvider as BaseAuthProvider } from "@churchapps/apihelper";
import { Environment } from "../helpers/Environment";

/**
 * Shared CustomAuthProvider implementation for the monolith
 * Extends the base provider from @churchapps/apihelper with module-specific logic
 */
export class CustomAuthProvider extends BaseAuthProvider {
  /**
   * Constructor for CustomAuthProvider
   */
  constructor() {
    super();
  }

  /**
   * Override to use consolidated environment configuration
   */
  protected getJwtSecret(): string {
    return Environment.jwtSecret;
  }

  /**
   * Override to use consolidated JWT expiration setting
   */
  protected getJwtExpiration(): string {
    return Environment.jwtExpiration || "2 days";
  }

  /**
   * Module-specific authentication validation
   * This can be extended as modules are migrated to add specific auth rules
   */
  protected async validateModuleAccess(token: any, moduleName?: string): Promise<boolean> {
    // Base validation - use the public validateToken method
    const isValid = await this.validateToken(token);
    if (!isValid) return false;

    // Add module-specific validation logic here as needed
    // For now, all authenticated users can access all modules
    // This can be refined during migration based on specific requirements

    return true;
  }

  /**
   * Get the appropriate membership API URL for auth validation
   */
  protected getMembershipApiUrl(): string {
    return Environment.membershipApi;
  }

  /**
   * Public method to validate token
   */
  async validateToken(token: any): Promise<boolean> {
    try {
      // Use the base class's validation logic if available
      // For now, implement basic JWT validation
      if (!token) return false;

      // Basic token structure validation
      if (typeof token === "string") {
        const parts = token.split(".");
        return parts.length === 3; // Basic JWT structure check
      }

      return !!token; // Assume token object is valid for now
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  }
}
