# Migration Plan: Microservices to Modular Monolith

## Executive Summary

This document outlines the migration plan for consolidating 6 microservices (AttendanceApi, ContentApi, DoingApi, GivingApi, MembershipApi, MessagingApi) into a single modular monolith while maintaining complete code separation between domains.

## Current Architecture Analysis

### Microservices Overview

1. **MembershipApi** - Central authentication service
   - JWT token management (2-day expiration)
   - User, church, group, and permission management
   - OAuth integration
   - Form builder with permissions

2. **AttendanceApi** - Attendance tracking
   - Campus/Service/ServiceTime hierarchy
   - Visit and session management

3. **ContentApi** - Media and content management
   - External integrations (YouTube, Vimeo, OpenAI)
   - CMS functionality (pages/sections/elements)
   - Sermon and media management

4. **GivingApi** - Financial management
   - Stripe integration
   - Donation and subscription handling

5. **MessagingApi** - Real-time communication
   - WebSocket support
   - Firebase push notifications
   - Email notification batching
   - Multiple Lambda functions (web, socket, timers)

6. **DoingApi** - Workflow automation
   - Condition-based triggers
   - Task scheduling

### Common Patterns Identified

1. **Technology Stack**
   - Node.js 20.x + TypeScript
   - Express.js with Inversify for DI
   - MySQL with repository pattern
   - AWS Lambda via Serverless Framework v3
   - @codegenie/serverless-express
   - Lambda layers for dependencies

2. **Shared Infrastructure**
   - @churchapps/apihelper for common functionality
   - CustomAuthProvider for authentication
   - Environment-based configuration
   - Multi-tenant architecture (churchId scoping)
   - Permission-based security

3. **Database Pattern**
   - Each service has its own database
   - Repository pattern with singleton access
   - Connection pooling via @churchapps/apihelper

## Proposed Modular Monolith Architecture

### Directory Structure

```
E:\LCS\CoreApis\CoreApis\
├── config/
│   ├── dev.json
│   ├── staging.json
│   ├── prod.json
│   └── swagger/
│       ├── attendance.json
│       ├── content.json
│       ├── doing.json
│       ├── giving.json
│       ├── membership.json
│       └── messaging.json
├── src/
│   ├── modules/
│   │   ├── attendance/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── helpers/
│   │   │   └── index.ts
│   │   ├── content/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── helpers/
│   │   │   └── index.ts
│   │   ├── doing/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── helpers/
│   │   │   └── index.ts
│   │   ├── giving/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── helpers/
│   │   │   └── index.ts
│   │   ├── membership/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   ├── helpers/
│   │   │   ├── auth/
│   │   │   └── index.ts
│   │   └── messaging/
│   │       ├── controllers/
│   │       ├── models/
│   │       ├── repositories/
│   │       ├── helpers/
│   │       ├── handlers/
│   │       └── index.ts
│   ├── shared/
│   │   ├── auth/
│   │   │   └── CustomAuthProvider.ts
│   │   ├── base/
│   │   │   └── BaseController.ts
│   │   ├── database/
│   │   │   ├── ConnectionManager.ts
│   │   │   └── RepositoryManager.ts
│   │   ├── helpers/
│   │   │   ├── Environment.ts
│   │   │   └── Permissions.ts
│   │   └── middleware/
│   ├── app.ts
│   ├── index.ts
│   ├── inversify.config.ts
│   └── lambda-handlers/
│       ├── web.js
│       ├── socket.js
│       └── timers.js
├── tools/
│   ├── dbScripts/
│   │   ├── attendance/
│   │   ├── content/
│   │   ├── doing/
│   │   ├── giving/
│   │   ├── membership/
│   │   └── messaging/
│   ├── initdb.ts
│   └── layer-package.json
├── package.json
├── serverless.yml
├── tsconfig.json
└── lambda.js
```

### Module Boundaries and Isolation

Each module will:
1. Maintain its own controllers, models, repositories, and helpers
2. Export only necessary interfaces through its index.ts
3. Not directly reference other modules' internals
4. Communicate through defined interfaces or events

### Shared Infrastructure Setup

#### 1. Unified Environment Configuration

```typescript
// src/shared/helpers/Environment.ts
export class Environment extends EnvironmentBase {
  // Module-specific API endpoints
  static membershipApi: string;
  static attendanceApi: string;
  static contentApi: string;
  static givingApi: string;
  static messagingApi: string;
  static doingApi: string;
  
  // Database connections per module
  static dbConnections: Map<string, string> = new Map();
  
  static async init(environment: string) {
    const config = await this.loadConfig(environment);
    await this.populateBase(config, "coreApi", environment);
    
    // Initialize module-specific configs
    this.initializeModuleConfigs(config);
    
    // Initialize database connections
    this.initializeDatabaseConnections(config);
  }
}
```

#### 2. Unified Repository Manager

```typescript
// src/shared/database/RepositoryManager.ts
export class RepositoryManager {
  private static instances: Map<string, any> = new Map();
  
  static getRepositories<T>(moduleName: string): T {
    if (!this.instances.has(moduleName)) {
      this.instances.set(moduleName, this.createRepositories(moduleName));
    }
    return this.instances.get(moduleName);
  }
  
  private static createRepositories(moduleName: string) {
    switch(moduleName) {
      case 'attendance': return new AttendanceRepositories();
      case 'content': return new ContentRepositories();
      case 'doing': return new DoingRepositories();
      case 'giving': return new GivingRepositories();
      case 'membership': return new MembershipRepositories();
      case 'messaging': return new MessagingRepositories();
    }
  }
}
```

#### 3. Unified Routing Strategy

```typescript
// src/app.ts
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
    { rootPath: '/api' },
    null,
    CustomAuthProvider
  );
  
  return app.setConfig(configFunction).build();
};
```

### Database Strategy

1. **Multi-Database Support**
   - Each module maintains its own database
   - Connection pooling per module using EnhancedPoolHelper
   - Shared connection management through ConnectionManager

2. **Connection String Management**
   ```json
   {
     "databases": {
       "attendance": "mysql://user:pass@host/attendance_db",
       "content": "mysql://user:pass@host/content_db",
       "doing": "mysql://user:pass@host/doing_db",
       "giving": "mysql://user:pass@host/giving_db",
       "membership": "mysql://user:pass@host/membership_db",
       "messaging": "mysql://user:pass@host/messaging_db"
     }
   }
   ```

### Lambda Configuration

```yaml
# serverless.yml
service: core-api

provider:
  name: aws
  runtime: nodejs20.x
  memorySize: 1024
  timeout: 30
  region: us-east-2
  
layers:
  dependencies:
    path: layer
    name: ${self:service}-dependencies-${self:custom.env}
    
functions:
  web:
    handler: lambda.web
    layers:
      - { Ref: DependenciesLambdaLayer }
    events:
      - http:
          path: /api/{proxy+}
          method: ANY
          cors: true
  
  socket:
    handler: lambda.socket
    layers:
      - { Ref: DependenciesLambdaLayer }
    events:
      - websocket: $default
      - websocket: $disconnect
  
  timer15Min:
    handler: lambda.timer15Min
    layers:
      - { Ref: DependenciesLambdaLayer }
    events:
      - schedule: rate(30 minutes)
  
  timerMidnight:
    handler: lambda.timerMidnight
    layers:
      - { Ref: DependenciesLambdaLayer }
    events:
      - schedule: cron(0 5 * * ? *)
```

## Migration Steps

### Phase 1: Setup Core Infrastructure (Week 1)

1. **Initialize CoreApis Project**
   - Create directory structure
   - Setup shared infrastructure
   - Configure build system
   - Setup unified package.json

2. **Create Shared Components**
   - Unified Environment configuration
   - Shared authentication provider
   - Base controllers
   - Connection management

3. **Setup Build Process**
   - TypeScript configuration
   - Lambda layer build
   - Development scripts

### Phase 2: Module Migration (Weeks 2-4)

**Order of Migration** (based on dependencies):
1. MembershipApi (no dependencies, provides auth)
2. AttendanceApi (depends on Membership)
3. ContentApi (depends on Membership)
4. GivingApi (depends on Membership)
5. DoingApi (depends on Membership)
6. MessagingApi (depends on all others)

**For each module:**
1. Copy module code to new structure
2. Update import paths
3. Integrate with unified routing
4. Update repository initialization
5. Test module in isolation
6. Test inter-module communication

### Phase 3: Integration Testing (Week 5)

1. **API Endpoint Testing**
   - Verify all endpoints work
   - Test authentication flow
   - Validate permissions

2. **Database Connectivity**
   - Test multi-database connections
   - Verify connection pooling
   - Test transaction handling

3. **Lambda Functions**
   - Test HTTP handlers
   - Test WebSocket handlers
   - Test scheduled tasks

### Phase 4: Deployment Preparation (Week 6)

1. **Environment Configuration**
   - Setup dev/staging/prod configs
   - Configure secrets management
   - Setup monitoring

2. **Deployment Testing**
   - Test local development
   - Test serverless deployment
   - Validate Lambda layers

3. **Documentation**
   - Update API documentation
   - Create deployment guide
   - Document troubleshooting

## Potential Challenges and Solutions

### 1. Database Connection Management

**Challenge**: Managing multiple database connections efficiently
**Solution**: 
- Use EnhancedPoolHelper with per-module pools
- Implement connection health checks
- Add connection retry logic

### 2. Module Isolation

**Challenge**: Preventing tight coupling between modules
**Solution**:
- Strict module boundaries through index.ts exports
- Event-based communication for cross-module operations
- Shared interfaces for common types

### 3. Authentication and Authorization

**Challenge**: Centralizing auth while maintaining module independence
**Solution**:
- MembershipApi module handles all auth
- Other modules import auth interfaces only
- Token validation through shared middleware

### 4. WebSocket Handling

**Challenge**: MessagingApi's complex WebSocket requirements
**Solution**:
- Separate Lambda function for WebSocket
- Shared connection state management
- Maintain existing WebSocket architecture

### 5. Configuration Management

**Challenge**: Managing module-specific and shared configurations
**Solution**:
- Hierarchical configuration structure
- Module-specific config sections
- Environment-based overrides

## Testing Strategy

### 1. Unit Testing
- Test each module in isolation
- Mock inter-module dependencies
- Test repository methods

### 2. Integration Testing
- Test API endpoints
- Test database operations
- Test cross-module workflows

### 3. Performance Testing
- Load test unified API
- Monitor memory usage
- Test connection pooling limits

### 4. Deployment Testing
- Test local development workflow
- Test Lambda deployment
- Test production-like environment

## Rollback Plan

1. **Gradual Migration**
   - Keep existing microservices running
   - Route traffic gradually to monolith
   - Monitor for issues

2. **Feature Flags**
   - Use feature flags for new endpoints
   - Easy toggle between old/new

3. **Database Backups**
   - Backup all databases before migration
   - Test restore procedures

4. **Quick Revert**
   - Keep deployment artifacts
   - Document rollback procedures
   - Test rollback in staging

## Success Metrics

1. **Performance**
   - API response times ≤ current
   - Memory usage stable
   - Cold start times improved

2. **Development Velocity**
   - Faster local development
   - Simplified deployment
   - Easier debugging

3. **Operational**
   - Reduced AWS costs
   - Simplified monitoring
   - Easier maintenance

## Timeline Summary

- **Week 1**: Core infrastructure setup
- **Weeks 2-4**: Module migration
- **Week 5**: Integration testing
- **Week 6**: Deployment preparation
- **Week 7**: Production rollout
- **Week 8**: Monitoring and optimization

## Next Steps

1. Review and approve migration plan
2. Setup CoreApis project structure
3. Begin Phase 1 implementation
4. Create detailed task breakdown
5. Assign team responsibilities