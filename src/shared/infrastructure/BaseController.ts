import { CustomBaseController, AuthenticatedUser } from "@churchapps/apihelper";
import { RepositoryManager } from "./RepositoryManager";
import { Permissions } from "../helpers/Permissions";
import { ValidationHelper } from "../helpers/ValidationHelper";
import { ApiResponse, ValidationError } from "../types/common";

/**
 * Shared base controller for all modules in the monolith
 * Provides common functionality and maintains consistency across modules
 */
export abstract class BaseController extends CustomBaseController {
  protected moduleName: string;

  constructor(moduleName: string) {
    super();
    this.moduleName = moduleName;
  }

  /**
   * Get repositories for the current module
   */
  protected async getRepositories<T>(): Promise<T> {
    return await RepositoryManager.getRepositories<T>(this.moduleName);
  }

  /**
   * Set up database context for the current module
   */
  protected async setupContext(): Promise<void> {
    await RepositoryManager.setupModuleContext(this.moduleName);
  }

  /**
   * Standard success response format
   */
  protected success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * Standard error response format (custom override)
   */
  protected errorResponse(message: string, errors?: string[]): ApiResponse {
    return {
      success: false,
      message,
      errors
    };
  }

  /**
   * Validation error response
   */
  protected validationError(errors: ValidationError[]): ApiResponse {
    return {
      success: false,
      message: "Validation failed",
      errors: errors.map(e => e.message)
    };
  }

  /**
   * Church ID validation helper
   */
  protected validateChurchId(churchId: string): string | null {
    if (!ValidationHelper.isValidChurchId(churchId)) {
      return "Invalid church ID format";
    }
    return null;
  }

  /**
   * Ensure user belongs to the specified church
   */
  protected validateChurchAccess(au: AuthenticatedUser, churchId: string): boolean {
    return au.churchId === churchId;
  }

  /**
   * Common permission check with better error handling
   */
  protected checkPermission(au: AuthenticatedUser, permission: any): boolean {
    try {
      return au.checkAccess(permission);
    } catch (error) {
      console.error("Permission check failed:", error);
      return false;
    }
  }

  /**
   * Validate required fields in request body
   */
  protected validateRequired(data: any, requiredFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const missingFields = ValidationHelper.validateRequired(data, requiredFields);
    
    missingFields.forEach(message => {
      const field = message.split(" ")[0];
      errors.push({
        code: "REQUIRED_FIELD",
        message,
        field,
        value: data[field]
      });
    });

    return errors;
  }

  /**
   * Sanitize input data
   */
  protected sanitizeInput(data: any): any {
    if (typeof data === "string") {
      return ValidationHelper.sanitizeString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (data && typeof data === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Ensure churchId is set on data objects
   */
  protected ensureChurchId(data: any, churchId: string): any {
    if (Array.isArray(data)) {
      return data.map(item => ({ ...item, churchId }));
    }
    
    if (data && typeof data === "object") {
      return { ...data, churchId };
    }
    
    return data;
  }

  /**
   * Form access validation for modules that support forms
   * This can be overridden by specific modules that need form permissions
   */
  protected async formAccess(au: AuthenticatedUser, formId: string, access?: string): Promise<boolean> {
    // Default implementation - override in modules that support forms
    if (au.checkAccess(Permissions.forms.admin)) return true;
    return false;
  }

  /**
   * Log action for audit trail
   */
  protected logAction(au: AuthenticatedUser, action: string, entityType: string, entityId: string, details?: any): void {
    // Implementation can be added here for audit logging
    console.log(`User ${au.id} performed ${action} on ${entityType} ${entityId}`, details);
  }

  /**
   * Handle common controller errors
   */
  protected handleError(error: any, defaultMessage: string = "An error occurred"): ApiResponse {
    console.error("Controller error:", error);
    
    if (error.code === "ER_DUP_ENTRY") {
      return this.errorResponse("Duplicate entry - record already exists");
    }
    
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return this.errorResponse("Referenced record does not exist");
    }
    
    if (error.message) {
      return this.errorResponse(error.message);
    }
    
    return this.errorResponse(defaultMessage);
  }
}

/**
 * Module-specific base controllers can extend this
 * Example: MembershipBaseController extends BaseController
 */
export abstract class ModuleBaseController extends BaseController {
  constructor(moduleName: string) {
    super(moduleName);
  }
}