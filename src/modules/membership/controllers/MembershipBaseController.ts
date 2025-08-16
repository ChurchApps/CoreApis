import { BaseController } from "../../../shared/infrastructure/BaseController";
import { MembershipRepositories } from "../repositories";
import { Permissions } from "../helpers";
import { AuthenticatedUser } from "@churchapps/apihelper";

export class MembershipBaseController extends BaseController {
  protected repositories?: MembershipRepositories;

  constructor() {
    super("membership");
  }

  /**
   * Get membership repositories with proper type safety
   */
  protected async getMembershipRepositories(): Promise<MembershipRepositories> {
    if (!this.repositories) {
      this.repositories = await super.getRepositories<MembershipRepositories>();
    }
    return this.repositories;
  }

  /**
   * Override the base formAccess method with membership-specific logic
   */
  public async formAccess(au: AuthenticatedUser, formId: string, access?: string): Promise<boolean> {
    if (au.checkAccess(Permissions.forms.admin)) return true;
    if (!formId) return false;

    const repos = await this.getMembershipRepositories();
    const formData = (await repos.form.loadWithMemberPermissions(au.churchId, formId, au.personId)) as any;
    if (formData?.contentType === "form")
      return (formData as any).action === "admin" || (formData as any).action === access;
    if (au.checkAccess(Permissions.forms.edit)) return true;
    return false;
  }
}
