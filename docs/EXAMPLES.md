# Usage Examples

This document provides examples of how to add alarms for your ~100 resources.

## Table of Contents

- [Example 1: ECS Services](#example-1-ecs-services)
- [Example 2: RDS Databases](#example-2-rds-databases)
- [Example 3: Load Balancers](#example-3-load-balancers)
- [Example 4: S3 Buckets](#example-4-s3-buckets)
- [Example 5: EFS File Systems](#example-5-efs-file-systems)
- [Example 6: FSx File Systems](#example-6-fsx-file-systems)
- [Example 7: SES Email Service](#example-7-ses-email-service)
- [Example 8: Step Functions](#example-8-step-functions)
- [Example 9: WAF Web ACLs](#example-9-waf-web-acls)
- [Example 10: Mixed Services](#example-10-mixed-services)

## Example 1: ECS Services

```typescript
// In lib/stacks/monitoring-stack.ts

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

## Example 2: RDS Instances

```typescript
// Monitor multiple RDS instances
const rdsInstances = [
  'users-db',
  'products-db',
  'analytics-db',
  'sessions-db',
];

rdsInstances.forEach((dbId) => {
  new RdsAlarms(this, `${dbId}Alarms`, {
    environment,
    dbInstanceIdentifier: dbId,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

## Example 3: Load Balancers

```typescript
// Monitor ALBs
const loadBalancers = [
  {
    name: 'api-alb',
    fullName: 'app/api-alb/1234567890abcdef',
    targetGroup: 'targetgroup/api-tg/1234567890abcdef',
  },
  {
    name: 'web-alb',
    fullName: 'app/web-alb/abcdef1234567890',
    targetGroup: 'targetgroup/web-tg/abcdef1234567890',
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

## Example 4: S3 Buckets

```typescript
// Monitor critical S3 buckets
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
    alarmTopic: alertTopics.warningAlarmTopic, // Less critical
  });
});
```

## Example 5: Step Functions

```typescript
// Monitor state machines
const stateMachines = [
  {
    name: 'order-processing',
    arn: 'arn:aws:states:us-east-1:123456789012:stateMachine:order-processing',
  },
  {
    name: 'data-pipeline',
    arn: 'arn:aws:states:us-east-1:123456789012:stateMachine:data-pipeline',
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

## Example 6: EFS File Systems

```typescript
// Monitor EFS
const efsFileSystems = ['fs-12345678', 'fs-87654321'];

efsFileSystems.forEach((fsId) => {
  new EfsAlarms(this, `${fsId}Alarms`, {
    environment,
    fileSystemId: fsId,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

## Example 7: FSx File Systems

```typescript
// Monitor FSx
const fsxFileSystems = [
  { id: 'fs-0123456789abcdef0', type: 'Windows' as const },
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

## Example 8: SES (Account-level)

```typescript
// Monitor SES reputation (one per account)
new SesAlarms(this, 'SesAlarms', {
  environment,
  alarmTopic: alertTopics.criticalAlarmTopic,
});
```

## Example 9: WAF Web ACLs

```typescript
// Monitor WAF
const webAcls = [
  { name: 'api-waf', id: '12345678-1234-1234-1234-123456789012' },
  { name: 'web-waf', id: '87654321-4321-4321-4321-210987654321' },
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

## Example 10: Complete Stack with All Resources

```typescript
// lib/stacks/monitoring-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AlertTopics } from '../constructs/notifications/alert-topics';
import { EcsAlarms } from '../constructs/alarms/ecs-alarms';
import { RdsAlarms } from '../constructs/alarms/rds-alarms';
import { ElbAlarms } from '../constructs/alarms/elb-alarms';
import { S3Alarms } from '../constructs/alarms/s3-alarms';
import { EfsAlarms } from '../constructs/alarms/efs-alarms';
import { FsxAlarms } from '../constructs/alarms/fsx-alarms';
import { SesAlarms } from '../constructs/alarms/ses-alarms';
import { StepFunctionsAlarms } from '../constructs/alarms/stepfunctions-alarms';
import { WafAlarms } from '../constructs/alarms/waf-alarms';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  smsPhoneNumbers?: string[];
  emailAddresses?: string[];
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, smsPhoneNumbers, emailAddresses } = props;

    // Create SNS topics
    const alertTopics = new AlertTopics(this, 'AlertTopics', {
      environment,
      smsPhoneNumbers,
      emailAddresses,
    });

    // ECS Services
    const ecsServices = [
      { cluster: 'api-cluster', service: 'user-service' },
      { cluster: 'api-cluster', service: 'auth-service' },
    ];
    ecsServices.forEach(({ cluster, service }) => {
      new EcsAlarms(this, `${service}Alarms`, {
        environment,
        clusterName: cluster,
        serviceName: service,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });

    // RDS Instances
    ['users-db', 'products-db'].forEach((dbId) => {
      new RdsAlarms(this, `${dbId}Alarms`, {
        environment,
        dbInstanceIdentifier: dbId,
        alarmTopic: alertTopics.criticalAlarmTopic,
      });
    });

    // Load Balancers
    new ElbAlarms(this, 'ApiAlbAlarms', {
      environment,
      loadBalancerFullName: 'app/api-alb/1234567890abcdef',
      targetGroupFullName: 'targetgroup/api-tg/1234567890abcdef',
      alarmTopic: alertTopics.criticalAlarmTopic,
    });

    // S3 Buckets
    new S3Alarms(this, 'UserUploadsBucketAlarms', {
      environment,
      bucketName: 'user-uploads',
      alarmTopic: alertTopics.warningAlarmTopic,
    });

    // EFS
    new EfsAlarms(this, 'SharedEfsAlarms', {
      environment,
      fileSystemId: 'fs-12345678',
      alarmTopic: alertTopics.criticalAlarmTopic,
    });

    // SES
    new SesAlarms(this, 'SesAlarms', {
      environment,
      alarmTopic: alertTopics.criticalAlarmTopic,
    });

    // Step Functions
    new StepFunctionsAlarms(this, 'OrderProcessingAlarms', {
      environment,
      stateMachineName: 'order-processing',
      stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:order-processing',
      alarmTopic: alertTopics.criticalAlarmTopic,
    });

    // WAF
    new WafAlarms(this, 'ApiWafAlarms', {
      environment,
      webAclName: 'api-waf',
      webAclId: '12345678-1234-1234-1234-123456789012',
      region: 'us-east-1',
      alarmTopic: alertTopics.criticalAlarmTopic,
    });
  }
}
```

## Tips for Managing 100+ Resources

1. **Use Arrays and Loops**: Define resources in arrays and iterate
2. **External Configuration**: Load resource lists from JSON files
3. **Naming Conventions**: Use consistent naming for easy identification
4. **Separate by Service**: Group alarms by service type
5. **Use Tags**: Tag all alarms for easy filtering in CloudWatch console
6. **Modular Approach**: Create separate stack files if needed

## Loading from Configuration File

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

// In monitoring-stack.ts
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
