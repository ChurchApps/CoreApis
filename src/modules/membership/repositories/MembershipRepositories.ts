import {
  GroupMemberRepository,
  GroupRepository,
  HouseholdRepository,
  PersonRepository,
  AnswerRepository,
  FormRepository,
  FormSubmissionRepository,
  QuestionRepository,
  MemberPermissionRepository,
  DomainRepository,
  SettingRepository,
  ClientErrorRepository,
  VisibilityPreferenceRepository,
  OAuthTokenRepository,
  OAuthCodeRepository,
  OAuthClientRepository,
  UserRepository,
  ChurchRepository,
  RoleRepository,
  RoleMemberRepository,
  RolePermissionRepository,
  UserChurchRepository,
  AccessLogRepository
} from "./index";

/**
 * Repository collection for the Membership module
 * This class replaces the singleton pattern with the new modular approach
 */
export class MembershipRepositories {
  public groupMember: GroupMemberRepository;
  public group: GroupRepository;
  public household: HouseholdRepository;
  public person: PersonRepository;
  public answer: AnswerRepository;
  public form: FormRepository;
  public formSubmission: FormSubmissionRepository;
  public question: QuestionRepository;
  public memberPermission: MemberPermissionRepository;
  
  public accessLog: AccessLogRepository;
  public church: ChurchRepository;
  public domain: DomainRepository;
  public role: RoleRepository;
  public roleMember: RoleMemberRepository;
  public rolePermission: RolePermissionRepository;
  public user: UserRepository;
  public userChurch: UserChurchRepository;
  public setting: SettingRepository;
  public visibilityPreference: VisibilityPreferenceRepository;
  
  public oAuthToken: OAuthTokenRepository;
  public oAuthCode: OAuthCodeRepository;
  public oAuthClient: OAuthClientRepository;
  
  public clientError: ClientErrorRepository;

  constructor() {
    this.groupMember = new GroupMemberRepository();
    this.group = new GroupRepository();
    this.household = new HouseholdRepository();
    this.person = new PersonRepository();
    this.answer = new AnswerRepository();
    this.form = new FormRepository();
    this.formSubmission = new FormSubmissionRepository();
    this.question = new QuestionRepository();
    this.memberPermission = new MemberPermissionRepository();
    
    this.accessLog = new AccessLogRepository();
    this.church = new ChurchRepository();
    this.domain = new DomainRepository();
    this.role = new RoleRepository();
    this.roleMember = new RoleMemberRepository();
    this.rolePermission = new RolePermissionRepository();
    this.user = new UserRepository();
    this.userChurch = new UserChurchRepository();
    this.setting = new SettingRepository();
    this.visibilityPreference = new VisibilityPreferenceRepository();
    
    this.oAuthToken = new OAuthTokenRepository();
    this.oAuthCode = new OAuthCodeRepository();
    this.oAuthClient = new OAuthClientRepository();
    
    this.clientError = new ClientErrorRepository();
  }
}