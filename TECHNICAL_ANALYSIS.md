# Technical Analysis: Microservices to Modular Monolith Migration

## Detailed Technical Findings

### 1. Service Dependencies and Integration Points

#### MembershipApi as Authentication Hub
- **Current**: All services depend on MembershipApi for authentication
- **Integration Points**:
  - JWT token validation endpoint
  - User/Church/Permission lookups
  - CustomAuthProvider shared across all services

#### Cross-Service Communication Patterns
```
MembershipApi ← All other services (authentication)
MessagingApi → All services (notifications)
ReportingApi → All services (data aggregation)
ContentApi → MembershipApi (user data)
AttendanceApi → MembershipApi (person/group data)
GivingApi → MembershipApi (person data)
DoingApi → MembershipApi (person/assignment data)
```

### 2. Database Architecture Analysis

#### Current Database Separation
Each service maintains its own MySQL database with distinct schemas:

- **membership_db**: 25+ tables (users, churches, groups, permissions, etc.)
- **attendance_db**: 8 tables (campuses, services, visits, sessions)
- **content_db**: 30+ tables (pages, sermons, songs, bible data)
- **giving_db**: 10 tables (donations, funds, subscriptions, customers)
- **messaging_db**: 9 tables (messages, conversations, notifications)
- **doing_db**: 13 tables (tasks, automations, plans, assignments)

#### Multi-Tenancy Pattern
All services implement multi-tenancy through `churchId` column in tables, ensuring data isolation.

### 3. Shared Code and Dependencies

#### Common NPM Dependencies
```json
{
  "@churchapps/apihelper": "^0.1.1-0.1.8",
  "@codegenie/serverless-express": "^4.16.0",
  "express": "^4.21.2",
  "inversify": "^6.2.2",
  "inversify-express-utils": "^6.5.0",
  "mysql2": "^3.14.1",
  "cors": "^2.8.5",
  "dotenv": "^17.0.1",
  "reflect-metadata": "^0.2.2"
}
```

#### Service-Specific Dependencies
- **MembershipApi**: jsonwebtoken, bcryptjs, node-geocoder, @hubspot/api-client
- **ContentApi**: openai, aws-sdk (S3), youtube/vimeo APIs
- **GivingApi**: stripe
- **MessagingApi**: @aws-sdk/client-apigatewaymanagementapi, firebase-admin
- **DoingApi**: No unique dependencies
- **AttendanceApi**: No unique dependencies

### 4. Configuration Patterns

#### Environment-Based Configuration
All services use similar configuration structure:
```json
{
  "appEnv": "dev",
  "appName": "ServiceName",
  "contentRoot": "http://localhost:3402",
  "membershipApi": "http://localhost:8083",
  "db": {
    "host": "localhost",
    "database": "service_db"
  }
}
```

#### Service Port Assignments (Development)
- MembershipApi: 8083
- AttendanceApi: 8084
- ContentApi: 8085
- GivingApi: 8086
- MessagingApi: 8087
- DoingApi: 8088

### 5. Lambda and Serverless Configuration

#### Standard Lambda Pattern
Most services use single Lambda function:
```yaml
functions:
  api:
    handler: lambda.universal
    memorySize: 512
    timeout: 10
```

#### MessagingApi Special Requirements
Multiple Lambda functions for different purposes:
- `web`: HTTP API (512MB)
- `socket`: WebSocket handling (1024MB)
- `timer15Min`: Email notifications (256MB)
- `timerMidnight`: Daily digest (256MB)

#### Lambda Layer Usage
All services build production dependencies into Lambda layers for:
- Faster cold starts
- Smaller deployment packages
- Shared dependency management

### 6. Authentication and Authorization

#### JWT Token Flow
1. User authenticates with MembershipApi
2. JWT token issued (2-day expiration)
3. Token includes: userId, personId, churchId, permissions
4. Other services validate token via CustomAuthProvider

#### Permission System
Hierarchical permission structure:
```typescript
Permissions = {
  attendance: { view, edit, admin },
  content: { view, edit, admin },
  giving: { view, edit, admin },
  membership: { view, edit, admin },
  messaging: { view, edit, admin },
  doing: { view, edit, admin }
}
```

### 7. API Routing Patterns

#### Controller Structure
All services follow similar patterns:
```typescript
@controller("/endpoint")
export class ServiceController extends ServiceBaseController {
  @httpGet("/:id")
  @authorize(Permissions.service.view)
  public async get(@requestParam("id") id: string, req: express.Request) {
    return await this.repositories.entity.load(au.churchId, id);
  }
}
```

#### Base Controller Pattern
Each service extends a base controller that provides:
- Repository access
- Authentication context
- Common utilities

### 8. Potential Conflicts and Challenges

#### 1. Repository Singleton Pattern
**Issue**: Each service uses `Repositories.getCurrent()` singleton
**Solution**: Namespace repositories by module:
```typescript
AttendanceRepositories.getCurrent()
ContentRepositories.getCurrent()
// etc.
```

#### 2. Environment Configuration Conflicts
**Issue**: Multiple Environment classes with same static properties
**Solution**: Unified Environment class with module-specific sections

#### 3. Database Connection Pooling
**Issue**: Each service creates its own connection pool
**Solution**: Shared connection manager with per-module pools

#### 4. Port Conflicts in Development
**Issue**: Services hardcoded to specific ports
**Solution**: Dynamic port assignment or unified routing

#### 5. WebSocket Integration
**Issue**: MessagingApi requires separate WebSocket handler
**Solution**: Maintain separate Lambda function for WebSocket

#### 6. Scheduled Tasks
**Issue**: MessagingApi has cron-based Lambda functions
**Solution**: Keep timer functions separate in serverless.yml

#### 7. File Storage
**Issue**: ContentApi uses local disk/S3 for file storage
**Solution**: Maintain existing file storage strategy

#### 8. External Service Integration
**Issue**: Multiple services integrate with external APIs
**Solution**: Module-specific helper classes for external integrations

### 9. Build and Deployment Considerations

#### TypeScript Compilation
- All services use TypeScript 5.8.3
- Similar tsconfig.json settings
- Need unified compilation strategy

#### Development Workflow
Current workflow per service:
1. `npm install`
2. `npm run initdb`
3. `npm run dev`

Unified workflow needed:
1. `npm install` (root)
2. `npm run initdb:all`
3. `npm run dev`

#### Deployment Process
Current: Individual service deployment
```bash
npm run deploy-staging
npm run deploy-prod
```

Unified: Single deployment command
```bash
npm run deploy:staging
npm run deploy:prod
```

### 10. Testing Infrastructure

#### Current Testing
- Limited test coverage
- Manual API testing
- No integration tests between services

#### Required Testing Infrastructure
1. Jest setup for unit tests
2. Supertest for API integration tests
3. Database transaction rollback for test isolation
4. Mock external services
5. WebSocket testing utilities

### 11. Monitoring and Logging

#### Current State
- CloudWatch logs per Lambda function
- Basic error logging
- No centralized monitoring

#### Requirements for Monolith
1. Structured logging with module context
2. Request tracing across modules
3. Performance monitoring
4. Error aggregation
5. Health check endpoints

### 12. Security Considerations

#### Current Security
- JWT-based authentication
- Permission-based authorization
- CORS configuration per service
- Multi-tenant data isolation

#### Additional Considerations
1. Module boundary enforcement
2. Prevent direct database access across modules
3. Audit logging for sensitive operations
4. Rate limiting per module
5. Input validation consistency

## Implementation Recommendations

### 1. Phased Approach
- Start with least dependent services
- Maintain backwards compatibility
- Use feature flags for gradual rollout

### 2. Module Isolation
- Strict TypeScript module boundaries
- No direct imports between modules
- Shared types in common directory

### 3. Database Strategy
- Keep separate databases initially
- Consider future consolidation
- Implement cross-module queries carefully

### 4. Development Experience
- Hot reload for all modules
- Unified logging output
- Single debug configuration

### 5. Performance Optimization
- Lazy load modules
- Optimize Lambda cold starts
- Consider caching strategy

## Risk Assessment

### High Risk Items
1. WebSocket migration complexity
2. Database connection management
3. Authentication service availability

### Medium Risk Items
1. Development workflow changes
2. Deployment process updates
3. Module boundary violations

### Low Risk Items
1. Configuration consolidation
2. Build process unification
3. Documentation updates

## Success Criteria

1. **Functional**: All existing APIs work without changes
2. **Performance**: No degradation in response times
3. **Development**: Faster local development setup
4. **Operational**: Simplified deployment and monitoring
5. **Maintainability**: Clear module boundaries and documentation