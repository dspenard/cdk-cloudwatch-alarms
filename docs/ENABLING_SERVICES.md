# Enabling Additional Services

This guide shows how to enable monitoring for additional AWS services.

## Table of Contents

- [Current State](#current-state)
- [Enabling Services](#enabling-services)
  - [ECS Services](#ecs-services)
  - [RDS Databases](#rds-databases)
  - [Load Balancers](#load-balancers-elb)
  - [EFS File Systems](#efs-file-systems)
  - [FSx File Systems](#fsx-file-systems)
  - [SES Email Service](#ses-email-service)
  - [Step Functions](#step-functions)
  - [WAF Web ACLs](#waf-web-acls)
- [Verification](#verification)
- [Disabling a Service](#disabling-a-service)
- [Best Practices](#best-practices)
- [Cost Impact](#cost-impact)
- [Managing Multiple Resources](#managing-multiple-resources)
- [Need Help?](#need-help)

## Current State

✅ **Active**: S3 bucket monitoring (tested)  
💤 **Commented Out**: ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF (not tested - reference implementations)

## Enabling Services

Each service requires these steps:

1. **Uncomment the import** at the top of `lib/stacks/monitoring-stack.ts`
2. **Uncomment the code section** for that service
3. **Update resource names** with your actual resource identifiers
4. **Deploy** the changes

You can enable multiple services at once by uncommenting multiple imports and code sections before deploying.

Example:

```typescript
// 1. Uncomment the import
import { EcsAlarms } from '../constructs/alarms/ecs-alarms';

// 2. Uncomment and update the code section
const ecsServices = [
  { cluster: 'my-cluster', service: 'my-service' },  // ← Your actual names
];

ecsServices.forEach(({ cluster, service }) => {
  new EcsAlarms(this, `${service}Alarms`, {
    environment,
    clusterName: cluster,
    serviceName: service,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

```bash
# 3. Deploy
npm run build
cdk deploy --context environment=dev --profile dev
```

### 🐳 ECS Services

**What you need**: ECS cluster names and service names

**Uncomment import**:
```typescript
import { EcsAlarms } from '../constructs/alarms/ecs-alarms';
```

**Uncomment and update the ECS section** (around line 95):
```typescript
const ecsServices = [
  { cluster: 'my-cluster', service: 'my-service' },  // ← Your actual names
  { cluster: 'my-cluster', service: 'another-service' },
];

ecsServices.forEach(({ cluster, service }) => {
  new EcsAlarms(this, `${service}Alarms`, {
    environment,
    clusterName: cluster,
    serviceName: service,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**What you get**: CPU, memory, and task count alarms per service

---

### 🗄️ RDS Databases

**What you need**: RDS instance identifiers

**Uncomment import**:
```typescript
import { RdsAlarms } from '../constructs/alarms/rds-alarms';
```

**Uncomment and update the RDS section** (around line 115):
```typescript
const rdsInstances = [
  'my-database',        // ← Your actual DB instance identifier
  'another-database',
];

rdsInstances.forEach((dbId) => {
  new RdsAlarms(this, `${dbId}Alarms`, {
    environment,
    dbInstanceIdentifier: dbId,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**What you get**: CPU, storage, connections, and latency alarms per instance

---

### ⚖️ Load Balancers (ELB)

**What you need**: Load balancer full names and target group names

**How to find them**:
```bash
# List load balancers
aws elbv2 describe-load-balancers --profile YOUR_PROFILE

# Get full name from LoadBalancerArn:
# arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234567890abcdef
# Full name: app/my-alb/1234567890abcdef

# List target groups
aws elbv2 describe-target-groups --profile YOUR_PROFILE
```

**Uncomment import**:
```typescript
import { ElbAlarms } from '../constructs/alarms/elb-alarms';
```

**Uncomment and update the ELB section** (around line 135):
```typescript
const loadBalancers = [
  {
    name: 'my-alb',
    fullName: 'app/my-alb/1234567890abcdef',              // ← From AWS
    targetGroup: 'targetgroup/my-tg/1234567890abcdef',    // ← From AWS
  },
];

loadBalancers.forEach(({ name, fullName, targetGroup }) => {
  new ElbAlarms(this, `${name}Alarms`, {
    environment,
    loadBalancerFullName: fullName,
    targetGroupFullName: targetGroup,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**What you get**: Response time, unhealthy hosts, and 5xx error alarms

---

### 📁 EFS File Systems

**What you need**: EFS file system IDs

**How to find them**:
```bash
aws efs describe-file-systems --profile YOUR_PROFILE
# Look for FileSystemId: fs-12345678
```

**Uncomment import**:
```typescript
import { EfsAlarms } from '../constructs/alarms/efs-alarms';
```

**Uncomment and update the EFS section** (around line 165):
```typescript
const efsFileSystems = [
  'fs-12345678',  // ← Your actual file system ID
  'fs-87654321',
];

efsFileSystems.forEach((fsId) => {
  new EfsAlarms(this, `${fsId}Alarms`, {
    environment,
    fileSystemId: fsId,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**What you get**: Burst credit and IO limit alarms

---

### 💾 FSx File Systems

**What you need**: FSx file system IDs and types

**How to find them**:
```bash
aws fsx describe-file-systems --profile YOUR_PROFILE
# Look for FileSystemId and FileSystemType
```

**Uncomment import**:
```typescript
import { FsxAlarms } from '../constructs/alarms/fsx-alarms';
```

**Uncomment and update the FSx section** (around line 185):
```typescript
const fsxFileSystems = [
  { id: 'fs-0123456789abcdef0', type: 'Windows' as const },  // ← Your actual values
  { id: 'fs-fedcba9876543210', type: 'Lustre' as const },
];

fsxFileSystems.forEach(({ id, type }) => {
  new FsxAlarms(this, `${id}Alarms`, {
    environment,
    fileSystemId: id,
    fileSystemType: type,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**Valid types**: `'Windows'`, `'Lustre'`, `'NetApp'`, `'OpenZFS'`

**What you get**: Storage capacity utilization alarms

---

### 📧 SES Email Service

**What you need**: Nothing! SES monitoring is account-level

**Uncomment import**:
```typescript
import { SesAlarms } from '../constructs/alarms/ses-alarms';
```

**Uncomment the SES section** (around line 205):
```typescript
new SesAlarms(this, 'SesAlarms', {
  environment,
  alarmTopic: alertTopics.criticalAlarmTopic,
});
```

**What you get**: Bounce rate and complaint rate alarms

---

### 🔄 Step Functions

**What you need**: State machine names and ARNs

**How to find them**:
```bash
aws stepfunctions list-state-machines --profile YOUR_PROFILE
# Look for name and stateMachineArn
```

**Uncomment import**:
```typescript
import { StepFunctionsAlarms } from '../constructs/alarms/stepfunctions-alarms';
```

**Uncomment and update the Step Functions section** (around line 215):
```typescript
const stateMachines = [
  {
    name: 'my-state-machine',  // ← Your actual state machine name
    arn: 'arn:aws:states:us-east-1:123456789012:stateMachine:my-state-machine',
  },
];

stateMachines.forEach(({ name, arn }) => {
  new StepFunctionsAlarms(this, `${name}Alarms`, {
    environment,
    stateMachineName: name,
    stateMachineArn: arn,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**What you get**: Failed and timed out execution alarms

---

### 🛡️ WAF Web ACLs

**What you need**: Web ACL names and IDs

**How to find them**:
```bash
aws wafv2 list-web-acls --scope REGIONAL --region us-east-1 --profile YOUR_PROFILE
# Look for Name and Id
```

**Uncomment import**:
```typescript
import { WafAlarms } from '../constructs/alarms/waf-alarms';
```

**Uncomment and update the WAF section** (around line 240):
```typescript
const webAcls = [
  { 
    name: 'my-waf',  // ← Your actual Web ACL name
    id: '12345678-1234-1234-1234-123456789012'  // ← Your actual Web ACL ID
  },
];

webAcls.forEach(({ name, id }) => {
  new WafAlarms(this, `${name}Alarms`, {
    environment,
    webAclName: name,
    webAclId: id,
    region: 'us-east-1',
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

**What you get**: Blocked requests alarms

---

## Verification

After enabling a service and deploying, verify the alarms were created. All resources are environment-specific (e.g., `dev`, `staging`, `prod`).

1. **Check CloudFormation**:
   - Go to CloudFormation console
   - Look for `monitoring-{env}` stack (e.g., `monitoring-dev`, `monitoring-prod`)
   - Check "Resources" tab for new alarms

2. **Check CloudWatch**:
   - Go to CloudWatch console
   - Click "Alarms"
   - Filter by environment prefix (e.g., "dev-", "prod-")
   - Verify new alarms exist

3. **Check Alarm Names**:
   - S3: `{env}-s3-BUCKET-NAME-bucket-size`
   - ECS: `{env}-ecs-SERVICE-NAME-cpu-utilization`
   - RDS: `{env}-rds-DB-ID-cpu-utilization`
   - etc.

## Disabling a Service

To disable a service:

1. Comment out the code section
2. Keep or comment out the import (doesn't matter)
3. Deploy

```bash
npm run build
cdk deploy --context environment={env} --profile {profile}
```

CDK will remove the alarms for that service.

## Best Practices

### Start Small
- Enable one service at a time
- Test and verify before adding more
- Monitor costs as you add services

### Use Consistent Naming
- Keep resource names descriptive
- Use consistent prefixes/suffixes
- Makes troubleshooting easier

### Test in Dev First
- Always test in dev environment
- Verify alarms trigger correctly
- Adjust thresholds if needed
- Then deploy to staging/prod

### Document Your Resources
- Keep a list of monitored resources
- Document any custom thresholds
- Note any special configurations

## Cost Impact

Adding services increases alarm count:

| Service | Alarms per Resource | Example Cost (10 resources) |
|---------|--------------------|-----------------------------|
| S3 | 2 | $1.00/month |
| ECS | 3 | $2.00/month |
| RDS | 4 | $3.00/month |
| ELB | 4 | $3.00/month |
| EFS | 2 | $1.00/month |
| FSx | 2 | $1.00/month |
| SES | 2 | Free (account-level, only 2 alarms) |
| Step Functions | 2 | $1.00/month |
| WAF | 1 | Free (10 resources = 10 alarms) |

First 10 alarms are free, then $0.10 per alarm per month.

## Managing Multiple Resources

When monitoring many resources, use these patterns for better organization.

### Pattern 1: Arrays and Loops

Instead of creating alarms one by one, define resources in arrays:

```typescript
// Monitor multiple ECS services
const ecsServices = [
  { cluster: 'api-cluster', service: 'user-service' },
  { cluster: 'api-cluster', service: 'auth-service' },
  { cluster: 'api-cluster', service: 'payment-service' },
  { cluster: 'worker-cluster', service: 'email-worker' },
];

ecsServices.forEach(({ cluster, service }) => {
  new EcsAlarms(this, `${service}Alarms`, {
    environment,
    clusterName: cluster,
    serviceName: service,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

### Pattern 2: External Configuration File

For many resources, load from a JSON file:

```typescript
// lib/config/resources.json
{
  "ecsServices": [
    { "cluster": "api-cluster", "service": "user-service" },
    { "cluster": "api-cluster", "service": "auth-service" }
  ],
  "rdsInstances": ["users-db", "products-db"],
  "s3Buckets": ["user-uploads", "backups"]
}

// In lib/stacks/monitoring-stack.ts
import * as resources from '../config/resources.json';

resources.ecsServices.forEach(({ cluster, service }) => {
  new EcsAlarms(this, `${service}Alarms`, {
    environment,
    clusterName: cluster,
    serviceName: service,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

### Pattern 3: Custom Thresholds Per Resource

Override default thresholds for specific resources:

```typescript
const s3Buckets = [
  { name: 'user-uploads', sizeThreshold: 500 * 1024 * 1024 * 1024 }, // 500GB
  { name: 'backups', sizeThreshold: 1000 * 1024 * 1024 * 1024 }, // 1TB
  { name: 'logs', sizeThreshold: 100 * 1024 * 1024 * 1024 }, // 100GB
];

s3Buckets.forEach(({ name, sizeThreshold }) => {
  new S3Alarms(this, `${name}BucketAlarms`, {
    environment,
    bucketName: name,
    customSizeThreshold: sizeThreshold,
    alarmTopic: alertTopics.warningAlarmTopic,
  });
});
```

### Tips for Scale

1. **Use consistent naming** - Makes troubleshooting easier
2. **Group by service type** - Keep all ECS alarms together, all RDS together, etc.
3. **External configuration** - Load resource lists from JSON files
4. **Separate stacks** - For many resources, consider multiple monitoring stacks
5. **Tag everything** - Use consistent tags for easy filtering in CloudWatch console
6. **Document exceptions** - Note any custom thresholds or special configurations

## Need Help?

- See [Architecture](ARCHITECTURE.md) for system design
- See alarm construct files in `lib/constructs/alarms/` for implementation details
- Check AWS CLI commands above to find resource identifiers

