import {
  AttendanceRepository,
  CampusRepository,
  GroupServiceTimeRepository,
  ServiceRepository,
  ServiceTimeRepository,
  SessionRepository,
  VisitRepository,
  VisitSessionRepository
} from "./index";

/**
 * Repository collection for the Attendance module
 * This class replaces the singleton pattern with the new modular approach
 */
export class AttendanceRepositories {
  public attendance: AttendanceRepository;
  public campus: CampusRepository;
  public groupServiceTime: GroupServiceTimeRepository;
  public service: ServiceRepository;
  public serviceTime: ServiceTimeRepository;
  public session: SessionRepository;
  public visit: VisitRepository;
  public visitSession: VisitSessionRepository;

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