# Enabling Additional Services

This guide shows how to enable monitoring for additional AWS services beyond S3.

## Table of Contents

- [Current State](#current-state)
- [How to Enable a Service](#how-to-enable-a-service)
- [ECS Services](#ecs-services)
- [RDS Databases](#rds-databases)
- [Load Balancers (ELB)](#load-balancers-elb)
- [EFS File Systems](#efs-file-systems)
- [FSx File Systems](#fsx-file-systems)
- [SES Email Service](#ses-email-service)
- [Step Functions](#step-functions)
- [WAF Web ACLs](#waf-web-acls)
- [Getting Resource Information](#getting-resource-information)
- [Next Steps](#next-steps)

## Current State

✅ **Active**: S3 bucket monitoring  
💤 **Commented Out**: ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF

## How to Enable a Service

Each service requires **2 steps**:

### Step 1: Uncomment the Import

At the top of `lib/stacks/monitoring-stack.ts`, uncomment the import:

```typescript
// Before:
// import { EcsAlarms } from '../constructs/alarms/ecs-alarms';

// After:
import { EcsAlarms } from '../constructs/alarms/ecs-alarms';
```

### Step 2: Uncomment the Code Section

Find the service section and uncomment the code:

```typescript
// Before:
/*
const ecsServices = [
  { cluster: 'api-cluster', service: 'user-service' },
];
...
*/

// After:
const ecsServices = [
  { cluster: 'api-cluster', service: 'user-service' },
];
// ... rest of code
```

### Step 3: Update Resource Names

Replace the example names with your actual resource names.

### Step 4: Deploy

```bash
npm run build
cdk deploy --context environment=dev --profile dev
```

## Service-by-Service Guide

### 🐳 Enable ECS Monitoring

**What you need**: ECS cluster names and service names

**Step 1**: Uncomment import
```typescript
import { EcsAlarms } from '../constructs/alarms/ecs-alarms';
```

**Step 2**: Uncomment and update the ECS section (around line 95)
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

### 🗄️ Enable RDS Monitoring

**What you need**: RDS instance identifiers

**Step 1**: Uncomment import
```typescript
import { RdsAlarms } from '../constructs/alarms/rds-alarms';
```

**Step 2**: Uncomment and update the RDS section (around line 115)
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

### ⚖️ Enable Load Balancer Monitoring

**What you need**: Load balancer full names and target group names

**How to find them**:
```bash
# List load balancers
aws elbv2 describe-load-balancers --profile dev

# Get full name from LoadBalancerArn:
# arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234567890abcdef
# Full name: app/my-alb/1234567890abcdef

# List target groups
aws elbv2 describe-target-groups --profile dev
```

**Step 1**: Uncomment import
```typescript
import { ElbAlarms } from '../constructs/alarms/elb-alarms';
```

**Step 2**: Uncomment and update the ELB section (around line 135)
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

### 📁 Enable EFS Monitoring

**What you need**: EFS file system IDs

**How to find them**:
```bash
aws efs describe-file-systems --profile dev
# Look for FileSystemId: fs-12345678
```

**Step 1**: Uncomment import
```typescript
import { EfsAlarms } from '../constructs/alarms/efs-alarms';
```

**Step 2**: Uncomment and update the EFS section (around line 165)
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

### 💾 Enable FSx Monitoring

**What you need**: FSx file system IDs and types

**How to find them**:
```bash
aws fsx describe-file-systems --profile dev
# Look for FileSystemId and FileSystemType
```

**Step 1**: Uncomment import
```typescript
import { FsxAlarms } from '../constructs/alarms/fsx-alarms';
```

**Step 2**: Uncomment and update the FSx section (around line 185)
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

### 📧 Enable SES Monitoring

**What you need**: Nothing! SES monitoring is account-level

**Step 1**: Uncomment import
```typescript
import { SesAlarms } from '../constructs/alarms/ses-alarms';
```

**Step 2**: Uncomment the SES section (around line 205)
```typescript
new SesAlarms(this, 'SesAlarms', {
  environment,
  alarmTopic: alertTopics.criticalAlarmTopic,
});
```

**What you get**: Bounce rate and complaint rate alarms

---

### 🔄 Enable Step Functions Monitoring

**What you need**: State machine names and ARNs

**How to find them**:
```bash
aws stepfunctions list-state-machines --profile dev
# Look for name and stateMachineArn
```

**Step 1**: Uncomment import
```typescript
import { StepFunctionsAlarms } from '../constructs/alarms/stepfunctions-alarms';
```

**Step 2**: Uncomment and update the Step Functions section (around line 215)
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

### 🛡️ Enable WAF Monitoring

**What you need**: Web ACL names and IDs

**How to find them**:
```bash
aws wafv2 list-web-acls --scope REGIONAL --region us-east-1 --profile dev
# Look for Name and Id
```

**Step 1**: Uncomment import
```typescript
import { WafAlarms } from '../constructs/alarms/waf-alarms';
```

**Step 2**: Uncomment and update the WAF section (around line 240)
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

## Example: Enable Multiple Services

Let's say you want to enable S3, ECS, and RDS:

### 1. Uncomment Imports
```typescript
import { S3Alarms } from '../constructs/alarms/s3-alarms';
import { EcsAlarms } from '../constructs/alarms/ecs-alarms';
import { RdsAlarms } from '../constructs/alarms/rds-alarms';
```

### 2. Keep S3 Section Active (already uncommented)
```typescript
const s3Buckets = ['my-bucket-1', 'my-bucket-2'];
// ... S3 code
```

### 3. Uncomment and Update ECS Section
```typescript
const ecsServices = [
  { cluster: 'my-cluster', service: 'my-service' },
];
// ... ECS code
```

### 4. Uncomment and Update RDS Section
```typescript
const rdsInstances = ['my-database'];
// ... RDS code
```

### 5. Deploy
```bash
npm run build
cdk deploy --context environment=dev --profile dev
```

## Verification

After enabling a service and deploying:

1. **Check CloudFormation**:
   - Go to CloudFormation console
   - Look for `monitoring-dev` stack
   - Check "Resources" tab for new alarms

2. **Check CloudWatch**:
   - Go to CloudWatch console
   - Click "Alarms"
   - Filter by environment (e.g., "dev-")
   - Verify new alarms exist

3. **Check Alarm Names**:
   - S3: `dev-s3-BUCKET-NAME-bucket-size`
   - ECS: `dev-ecs-SERVICE-NAME-cpu-utilization`
   - RDS: `dev-rds-DB-ID-cpu-utilization`
   - etc.

## Disabling a Service

To disable a service:

1. Comment out the code section
2. Keep or comment out the import (doesn't matter)
3. Deploy

```bash
npm run build
cdk deploy --context environment=dev --profile dev
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
| SES | 2 | $0.20/month (account-level) |
| Step Functions | 2 | $1.00/month |
| WAF | 1 | $0.50/month |

First 10 alarms are free, then $0.10 per alarm per month.

## Quick Reference

```typescript
// Import pattern
import { ServiceAlarms } from '../constructs/alarms/service-alarms';

// Usage pattern
const resources = ['resource-1', 'resource-2'];

resources.forEach((resourceId) => {
  new ServiceAlarms(this, `${resourceId}Alarms`, {
    environment,
    // service-specific properties
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

## Need Help?

- See `EXAMPLES.md` for more code examples
- See `ARCHITECTURE.md` for system design
- See alarm construct files in `lib/constructs/alarms/` for details
- Check AWS CLI commands above to find resource identifiers

---

**Ready to enable more services?** Just uncomment the import and code section, update the resource names, and deploy!
