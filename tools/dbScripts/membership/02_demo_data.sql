-- Membership module demo data
-- Sample data for development and testing

-- Insert demo church
INSERT IGNORE INTO churches (id, name, address1, city, state, zip, country, phone, website, subDomain) VALUES
('demo-church-id', 'Demo Church', '123 Church Street', 'Anytown', 'CA', '12345', 'US', '555-123-4567', 'https://demo.church', 'demo');

-- Insert demo users
INSERT IGNORE INTO users (id, email, firstName, lastName, displayName, emailVerified) VALUES
('demo-user-1', 'admin@demo.church', 'Admin', 'User', 'Admin User', true),
('demo-user-2', 'pastor@demo.church', 'John', 'Pastor', 'Pastor John', true),
('demo-user-3', 'member@demo.church', 'Jane', 'Member', 'Jane Member', true);

-- Insert demo household
INSERT IGNORE INTO households (id, churchId, name, address1, city, state, zip, country) VALUES
('demo-household-1', 'demo-church-id', 'Smith Family', '456 Family Lane', 'Anytown', 'CA', '12345', 'US');

-- Insert demo people
INSERT IGNORE INTO people (id, churchId, userId, householdId, householdRole, firstName, lastName, email, membershipStatus) VALUES
('demo-person-1', 'demo-church-id', 'demo-user-1', 'demo-household-1', 'Head', 'Admin', 'User', 'admin@demo.church', 'Active'),
('demo-person-2', 'demo-church-id', 'demo-user-2', NULL, NULL, 'John', 'Pastor', 'pastor@demo.church', 'Active'),
('demo-person-3', 'demo-church-id', 'demo-user-3', 'demo-household-1', 'Spouse', 'Jane', 'Member', 'member@demo.church', 'Active');

-- Insert demo roles
INSERT IGNORE INTO roles (id, churchId, appName, name) VALUES
('demo-role-admin', 'demo-church-id', 'MembershipApi', 'System Admin'),
('demo-role-pastor', 'demo-church-id', 'MembershipApi', 'Pastor'),
('demo-role-member', 'demo-church-id', 'MembershipApi', 'Member'),
('demo-role-attendance-admin', 'demo-church-id', 'AttendanceApi', 'Attendance Admin'),
('demo-role-content-admin', 'demo-church-id', 'ContentApi', 'Content Admin'),
('demo-role-giving-admin', 'demo-church-id', 'GivingApi', 'Giving Admin'),
('demo-role-messaging-admin', 'demo-church-id', 'MessagingApi', 'Messaging Admin'),
('demo-role-doing-admin', 'demo-church-id', 'DoingApi', 'Workflow Admin');

-- Insert demo role permissions
INSERT IGNORE INTO rolePermissions (id, churchId, roleId, apiName, contentType, action) VALUES
-- System Admin permissions (full access to all modules)
('perm-admin-1', 'demo-church-id', 'demo-role-admin', 'MembershipApi', 'Church', 'Edit'),
('perm-admin-2', 'demo-church-id', 'demo-role-admin', 'MembershipApi', 'User', 'Edit'),
('perm-admin-3', 'demo-church-id', 'demo-role-admin', 'AttendanceApi', 'Service', 'Edit'),
('perm-admin-4', 'demo-church-id', 'demo-role-admin', 'ContentApi', 'Page', 'Edit'),
('perm-admin-5', 'demo-church-id', 'demo-role-admin', 'GivingApi', 'Donation', 'Edit'),
('perm-admin-6', 'demo-church-id', 'demo-role-admin', 'MessagingApi', 'Message', 'Edit'),
('perm-admin-7', 'demo-church-id', 'demo-role-admin', 'DoingApi', 'Task', 'Edit'),

-- Pastor permissions
('perm-pastor-1', 'demo-church-id', 'demo-role-pastor', 'MembershipApi', 'Person', 'Edit'),
('perm-pastor-2', 'demo-church-id', 'demo-role-pastor', 'AttendanceApi', 'Service', 'View'),
('perm-pastor-3', 'demo-church-id', 'demo-role-pastor', 'ContentApi', 'Page', 'Edit'),

-- Member permissions
('perm-member-1', 'demo-church-id', 'demo-role-member', 'MembershipApi', 'Person', 'View'),
('perm-member-2', 'demo-church-id', 'demo-role-member', 'ContentApi', 'Page', 'View');

-- Assign permissions to users
INSERT IGNORE INTO permissions (id, churchId, appName, contentType, action, roleId, userId) VALUES
('user-perm-1', 'demo-church-id', 'MembershipApi', 'Church', 'Edit', 'demo-role-admin', 'demo-user-1'),
('user-perm-2', 'demo-church-id', 'MembershipApi', 'Person', 'Edit', 'demo-role-pastor', 'demo-user-2'),
('user-perm-3', 'demo-church-id', 'MembershipApi', 'Person', 'View', 'demo-role-member', 'demo-user-3');

-- Insert demo groups
INSERT IGNORE INTO groups (id, churchId, name, categoryName, about, isPublic, trackAttendance) VALUES
('demo-group-1', 'demo-church-id', 'Sunday Service', 'Worship', 'Main worship service', true, true),
('demo-group-2', 'demo-church-id', 'Bible Study', 'Education', 'Weekly Bible study group', true, true),
('demo-group-3', 'demo-church-id', 'Youth Group', 'Ministry', 'Youth ministry group', true, true),
('demo-group-4', 'demo-church-id', 'Worship Team', 'Ministry', 'Music ministry team', false, false);

-- Insert group memberships
INSERT IGNORE INTO groupMembers (id, churchId, groupId, personId, joinDate) VALUES
('demo-gm-1', 'demo-church-id', 'demo-group-1', 'demo-person-1', CURDATE()),
('demo-gm-2', 'demo-church-id', 'demo-group-1', 'demo-person-2', CURDATE()),
('demo-gm-3', 'demo-church-id', 'demo-group-1', 'demo-person-3', CURDATE()),
('demo-gm-4', 'demo-church-id', 'demo-group-2', 'demo-person-1', CURDATE()),
('demo-gm-5', 'demo-church-id', 'demo-group-3', 'demo-person-3', CURDATE()),
('demo-gm-6', 'demo-church-id', 'demo-group-4', 'demo-person-2', CURDATE());

-- Insert demo form
INSERT IGNORE INTO forms (id, churchId, name, contentType, content) VALUES
('demo-form-1', 'demo-church-id', 'Visitor Information', 'form', '{"title":"Visitor Information","fields":[{"type":"text","name":"firstName","label":"First Name","required":true},{"type":"text","name":"lastName","label":"Last Name","required":true},{"type":"email","name":"email","label":"Email"},{"type":"tel","name":"phone","label":"Phone"},{"type":"textarea","name":"comments","label":"Comments"}]}');

-- Insert demo notes
INSERT IGNORE INTO notes (id, churchId, personId, contents, noteType, addedBy) VALUES
('demo-note-1', 'demo-church-id', 'demo-person-1', 'Active church volunteer, coordinates community outreach', 'General', 'demo-user-2'),
('demo-note-2', 'demo-church-id', 'demo-person-3', 'New member, recently moved from another city', 'General', 'demo-user-2');