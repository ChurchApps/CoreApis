-- Membership module database schema
-- Core membership and authentication tables for church management system

-- Churches table - foundational for multi-tenancy
CREATE TABLE IF NOT EXISTS churches (
  id varchar(36) NOT NULL PRIMARY KEY,
  name varchar(100) NOT NULL,
  address1 varchar(100),
  address2 varchar(100),
  city varchar(50),
  state varchar(50),
  zip varchar(20),
  country varchar(50) DEFAULT 'US',
  phone varchar(20),
  website varchar(100),
  logo varchar(255),
  registrationDate datetime DEFAULT CURRENT_TIMESTAMP,
  settings TEXT,
  subDomain varchar(50),
  keyIcon varchar(255)
);

-- People table - core member information
CREATE TABLE IF NOT EXISTS people (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  userId varchar(36),
  householdId varchar(36),
  householdRole varchar(20),
  firstName varchar(50),
  middleName varchar(50),
  lastName varchar(50),
  nickName varchar(50),
  prefix varchar(10),
  suffix varchar(10),
  email varchar(100),
  birthDate date,
  gender varchar(20),
  maritalStatus varchar(20),
  anniversary date,
  mobilePhone varchar(20),
  homePhone varchar(20),
  workPhone varchar(20),
  membershipStatus varchar(20),
  membershipDate date,
  batismDate date,
  address1 varchar(100),
  address2 varchar(100),
  city varchar(50),
  state varchar(50),
  zip varchar(20),
  country varchar(50) DEFAULT 'US',
  photoUrl varchar(255),
  notes TEXT,
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_people_church (churchId),
  INDEX idx_people_user (userId),
  INDEX idx_people_household (householdId),
  INDEX idx_people_email (email)
);

-- Households table - family/household groupings
CREATE TABLE IF NOT EXISTS households (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  address1 varchar(100),
  address2 varchar(100),
  city varchar(50),
  state varchar(50),
  zip varchar(20),
  country varchar(50) DEFAULT 'US',
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_households_church (churchId)
);

-- Groups table - ministries, classes, teams, etc.
CREATE TABLE IF NOT EXISTS groups (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  name varchar(50) NOT NULL,
  categoryName varchar(50),
  parentPickup boolean DEFAULT false,
  about TEXT,
  photoUrl varchar(255),
  tags varchar(255),
  removed boolean DEFAULT false,
  trackAttendance boolean DEFAULT false,
  isPublic boolean DEFAULT true,
  parentId varchar(36),
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_groups_church (churchId),
  INDEX idx_groups_parent (parentId)
);

-- Group members table - people assigned to groups
CREATE TABLE IF NOT EXISTS groupMembers (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  groupId varchar(36) NOT NULL,
  personId varchar(36) NOT NULL,
  joinDate date,
  dateInactivated date,
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_groupMembers_church (churchId),
  INDEX idx_groupMembers_group (groupId),
  INDEX idx_groupMembers_person (personId)
);

-- User accounts table - authentication
CREATE TABLE IF NOT EXISTS users (
  id varchar(36) NOT NULL PRIMARY KEY,
  email varchar(50) NOT NULL UNIQUE,
  authGuid varchar(36),
  firstName varchar(50),
  lastName varchar(50),
  displayName varchar(50),
  password varchar(100),
  registrationDate datetime DEFAULT CURRENT_TIMESTAMP,
  lastLogin datetime,
  resetPassword boolean DEFAULT false,
  resetPasswordExpires datetime,
  resetPasswordToken varchar(255),
  personalChurchId varchar(36),
  emailVerified boolean DEFAULT false,
  INDEX idx_users_email (email),
  INDEX idx_users_authGuid (authGuid)
);

-- Role definitions table
CREATE TABLE IF NOT EXISTS roles (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  appName varchar(50) NOT NULL,
  name varchar(50) NOT NULL,
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_roles_church (churchId),
  INDEX idx_roles_app (appName)
);

-- Permission definitions table
CREATE TABLE IF NOT EXISTS permissions (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  appName varchar(50) NOT NULL,
  contentType varchar(50),
  contentId varchar(36),
  action varchar(50),
  roleId varchar(36),
  userId varchar(36),
  personId varchar(36),
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_permissions_church (churchId),
  INDEX idx_permissions_role (roleId),
  INDEX idx_permissions_user (userId),
  INDEX idx_permissions_person (personId)
);

-- Role permissions mapping table
CREATE TABLE IF NOT EXISTS rolePermissions (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  roleId varchar(36) NOT NULL,
  apiName varchar(50) NOT NULL,
  contentType varchar(50),
  action varchar(50),
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rolePermissions_church (churchId),
  INDEX idx_rolePermissions_role (roleId)
);

-- User sessions table - JWT token management
CREATE TABLE IF NOT EXISTS sessions (
  id varchar(36) NOT NULL PRIMARY KEY,
  userId varchar(36) NOT NULL,
  churchId varchar(36) NOT NULL,
  ipAddress varchar(45),
  userAgent TEXT,
  sessionKey varchar(255),
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  lastAccessed datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sessions_user (userId),
  INDEX idx_sessions_church (churchId),
  INDEX idx_sessions_key (sessionKey)
);

-- OAuth service integrations table
CREATE TABLE IF NOT EXISTS oAuthServices (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  name varchar(50) NOT NULL,
  clientId varchar(255),
  clientSecret varchar(255),
  scope varchar(255),
  redirectUri varchar(255),
  authorizationUrl varchar(255),
  tokenUrl varchar(255),
  apiUrl varchar(255),
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_oAuthServices_church (churchId)
);

-- Forms table - dynamic form builder
CREATE TABLE IF NOT EXISTS forms (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  name varchar(100) NOT NULL,
  content TEXT,
  contentType varchar(20) DEFAULT 'form',
  removed boolean DEFAULT false,
  createdDate datetime DEFAULT CURRENT_TIMESTAMP,
  modifiedDate datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_forms_church (churchId)
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS formSubmissions (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  formId varchar(36) NOT NULL,
  contentType varchar(20) DEFAULT 'formSubmission',
  content TEXT,
  submissionDate datetime DEFAULT CURRENT_TIMESTAMP,
  revision int DEFAULT 1,
  removed boolean DEFAULT false,
  INDEX idx_formSubmissions_church (churchId),
  INDEX idx_formSubmissions_form (formId)
);

-- Notes table - general notes system
CREATE TABLE IF NOT EXISTS notes (
  id varchar(36) NOT NULL PRIMARY KEY,
  churchId varchar(36) NOT NULL,
  personId varchar(36),
  householdId varchar(36),
  groupId varchar(36),
  contents TEXT,
  noteType varchar(20),
  addedBy varchar(36),
  dateAdded datetime DEFAULT CURRENT_TIMESTAMP,
  removed boolean DEFAULT false,
  INDEX idx_notes_church (churchId),
  INDEX idx_notes_person (personId),
  INDEX idx_notes_household (householdId),
  INDEX idx_notes_group (groupId)
);