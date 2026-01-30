# Architecture Overview

## Architecture Diagrams

### System Architecture
![CDK Monitoring Architecture](../generated-diagrams/cdk-monitoring-architecture.png)

The diagram above shows the complete monitoring infrastructure:
- **Monitored Resources**: S3, ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF
- **CloudWatch**: Collects metrics and triggers alarms based on thresholds
- **SNS Topics**: Routes notifications to different channels (Critical vs Warning)
- **Notification Channels**: Email, Slack, and Teams integrations
- **CDK/CloudFormation**: Infrastructure as Code deployment

### Deployment Flow
![CDK Deployment Flow](../generated-diagrams/cdk-deployment-flow.png)

The deployment flow shows:
1. Developer pushes code to Git repository
2. GitHub Actions triggers automated build and test
3. CDK deploys infrastructure to AWS
4. CloudFormation provisions all monitoring resources
5. Resources are ready to monitor and alert

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AWS Account (Dev)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Monitored Resources                     │  │
│  │                                                            │  │
│  │  ECS Services  RDS Instances  Load Balancers  S3 Buckets │  │
│  │  EFS Systems   FSx Systems    Step Functions  WAF ACLs   │  │
│  │  SES           ...and more                                │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                       │
│                           │ Metrics                               │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  CloudWatch Alarms                        │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ECS Alarms│  │RDS Alarms│  │ELB Alarms│  │S3 Alarms │ │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │  │
│  │       │             │             │             │        │  │
│  │       └─────────────┴─────────────┴─────────────┘        │  │
│  │                           │                               │  │
│  └───────────────────────────┼───────────────────────────────┘  │
│                              │                                   │
│                              │ Alarm Notifications               │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      SNS Topics                           │  │
│  │                                                            │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐       │  │
│  │  │ Critical Alarm Topic│  │ Warning Alarm Topic │       │  │
│  │  └──────────┬──────────┘  └──────────┬──────────┘       │  │
│  │             │                         │                   │  │
│  └─────────────┼─────────────────────────┼───────────────────┘  │
│                │                         │                       │
│                │                         │                       │
│    ┌───────────┼─────────────────────────┼───────────┐          │
│    │           │                         │           │          │
│    │           ▼                         ▼           │          │
│    │  ┌─────────────────┐      ┌─────────────────┐ │          │
│    │  │ Lambda: Slack   │      │ Lambda: Teams   │ │          │
│    │  │   Forwarder     │      │   Forwarder     │ │          │
│    │  └────────┬────────┘      └────────┬────────┘ │          │
│    │           │                         │           │          │
│    └───────────┼─────────────────────────┼───────────┘          │
│                │                         │                       │
└────────────────┼─────────────────────────┼───────────────────────┘
                 │                         │
                 │ HTTPS                   │ HTTPS
                 ▼                         ▼
        ┌─────────────────┐      ┌─────────────────┐
        │  Slack Channel  │      │  Teams Channel  │
        │   #aws-alerts   │      │   AWS Alerts    │
        └─────────────────┘      └─────────────────┘

        ┌─────────────────┐      ┌─────────────────┐
        │   SMS Messages  │      │  Email Messages │
        │  +1-202-555-xxx │      │ team@example.com│
        └─────────────────┘      └─────────────────┘
```

## Multi-Environment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                          │
│                      cdk-monitoring (main)                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ Push/PR Merge
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                       GitHub Actions CI/CD                        │
│                                                                    │
│  Build → Test → Deploy Dev → Deploy Staging → Deploy Prod        │
└───┬──────────────────┬──────────────────┬───────────────────┬────┘
    │                  │                  │                   │
    │ Auto Deploy      │ Auto Deploy      │ Manual Approval   │
    ▼                  ▼                  ▼                   ▼
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│   Dev   │      │ Staging │      │  Prod   │      │  Prod   │
│ Account │      │ Account │      │ Account │      │ Account │
│ (111..1)│      │ (222..2)│      │ (333..3)│      │ (333..3)│
│         │      │         │      │         │      │         │
│ us-east-1│     │ us-east-1│     │ us-east-1│     │ us-east-1│
└─────────┘      └─────────┘      └─────────┘      └─────────┘
```

## CDK Stack Architecture

```
MonitoringStack
├── AlertTopics (Construct)
│   ├── CriticalAlarmTopic (SNS Topic)
│   │   ├── SMS Subscriptions
│   │   └── Email Subscriptions
│   └── WarningAlarmTopic (SNS Topic)
│       ├── SMS Subscriptions
│       └── Email Subscriptions
│
├── SlackForwarder (Construct) [Optional]
│   ├── Lambda Function
│   └── SNS Subscription
│
├── TeamsForwarder (Construct) [Optional]
│   ├── Lambda Function
│   └── SNS Subscription
│
├── EcsAlarms (Construct) [Multiple Instances]
│   ├── CPU Utilization Alarm
│   ├── Memory Utilization Alarm
│   └── Running Task Count Alarm
│
├── RdsAlarms (Construct) [Multiple Instances]
│   ├── CPU Utilization Alarm
│   ├── Free Storage Space Alarm
│   ├── Read Latency Alarm
│   └── Write Latency Alarm
│
├── ElbAlarms (Construct) [Multiple Instances]
│   ├── Target Response Time Alarm
│   ├── Unhealthy Host Count Alarm
│   ├── HTTP 5xx Target Alarm
│   └── HTTP 5xx ELB Alarm
│
├── EfsAlarms (Construct) [Multiple Instances]
│   ├── Burst Credit Balance Alarm
│   └── Percent IO Limit Alarm
│
├── FsxAlarms (Construct) [Multiple Instances]
│   ├── Storage Capacity Utilization Alarm
│   └── Free Storage Capacity Alarm
│
├── S3Alarms (Construct) [Multiple Instances]
│   ├── Bucket Size Alarm
│   └── Number of Objects Alarm
│
├── SesAlarms (Construct) [One per Account]
│   ├── Bounce Rate Alarm
│   └── Complaint Rate Alarm
│
├── StepFunctionsAlarms (Construct) [Multiple Instances]
│   ├── Executions Failed Alarm
│   └── Executions Timed Out Alarm
│
└── WafAlarms (Construct) [Multiple Instances]
    └── Blocked Requests Alarm
```

## Data Flow

### 1. Alarm Trigger Flow
```
Resource Metric → CloudWatch → Alarm Evaluation → State Change
                                                        ↓
                                                   SNS Topic
                                                        ↓
                                    ┌───────────────────┴───────────────────┐
                                    ↓                   ↓                   ↓
                              SMS Delivery      Lambda Function      Email Delivery
                                    ↓                   ↓
                              Phone Number      Slack/Teams Webhook
```

### 2. Deployment Flow
```
Developer → Git Push → GitHub Actions → CDK Deploy → CloudFormation
                                                           ↓
                                                    Create/Update:
                                                    - SNS Topics
                                                    - Lambda Functions
                                                    - CloudWatch Alarms
                                                    - IAM Roles
```

### 3. Configuration Flow
```
environment-config.ts → CDK App → MonitoringStack → Constructs
                                                          ↓
alarm-thresholds.ts → Alarm Constructs → CloudWatch Alarms
```

## Notification Routing

### Critical Alarms (Production)
```
CloudWatch Alarm → SNS Critical Topic → SMS
                                      → Email
                                      → Slack (#aws-alerts-prod)
                                      → Teams (AWS Alerts)
```

### Warning Alarms (All Environments)
```
CloudWatch Alarm → SNS Warning Topic → Email
                                     → Slack (#aws-warnings)
```

### Development Alarms
```
CloudWatch Alarm → SNS Critical Topic → Slack (#aws-alerts-dev)
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      IAM Permissions                         │
│                                                               │
│  Lambda Execution Role                                       │
│  ├── logs:CreateLogGroup                                    │
│  ├── logs:CreateLogStream                                   │
│  └── logs:PutLogEvents                                      │
│                                                               │
│  SNS Topic Policy                                            │
│  ├── Allow CloudWatch to Publish                            │
│  └── Allow Lambda to Subscribe                              │
│                                                               │
│  CloudWatch Alarms                                           │
│  └── Allow SNS Actions on Topics                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Secrets Management                        │
│                                                               │
│  Webhook URLs (Optional)                                     │
│  ├── AWS Secrets Manager                                    │
│  ├── Environment Variables (Lambda)                         │
│  └── CDK Context (Not Recommended)                          │
└─────────────────────────────────────────────────────────────┘
```

## Scalability Pattern

### For ~100 Resources

```typescript
// Define resources in arrays
const ecsServices = [
  { cluster: 'api-cluster', service: 'service-1' },
  { cluster: 'api-cluster', service: 'service-2' },
  // ... 98 more
];

// Loop to create alarms
ecsServices.forEach(({ cluster, service }) => {
  new EcsAlarms(this, `${service}Alarms`, {
    environment,
    clusterName: cluster,
    serviceName: service,
    alarmTopic: alertTopics.criticalAlarmTopic,
  });
});
```

### Resource Organization

```
100 Resources
├── 20 ECS Services → 60 Alarms (3 per service)
├── 15 RDS Instances → 60 Alarms (4 per instance)
├── 10 Load Balancers → 40 Alarms (4 per LB)
├── 20 S3 Buckets → 40 Alarms (2 per bucket)
├── 10 EFS Systems → 20 Alarms (2 per system)
├── 5 FSx Systems → 10 Alarms (2 per system)
├── 10 Step Functions → 20 Alarms (2 per function)
├── 5 WAF ACLs → 5 Alarms (1 per ACL)
└── 1 SES Account → 2 Alarms
                    ─────────────
                    257 Total Alarms
```

## Cost Breakdown

```
CloudWatch Alarms
├── First 10 alarms: Free
├── Next 247 alarms: $0.10 × 247 = $24.70/month
└── Total: $24.70/month

SNS
├── First 1,000 emails: Free
├── SMS: $0.00645 per message (variable)
└── Total: ~$0.50/month (excluding SMS)

Lambda
├── First 1M requests: Free
├── Compute time: Minimal
└── Total: ~$0.20/month

Total Monthly Cost: ~$25-30/month (excluding SMS)
```

## High Availability

- **SNS**: Multi-AZ by default
- **Lambda**: Automatic scaling and redundancy
- **CloudWatch**: Highly available service
- **No single point of failure**

## Disaster Recovery

- **Infrastructure as Code**: Entire setup in Git
- **Multi-Region**: Can deploy to multiple regions
- **Backup**: Git repository serves as backup
- **Recovery Time**: ~10 minutes to redeploy

## Monitoring the Monitoring

```
Lambda Functions
├── CloudWatch Logs for debugging
├── Lambda Insights for performance
└── Dead Letter Queue for failed messages

SNS Topics
├── CloudWatch Metrics for delivery
└── Failed delivery notifications

CloudWatch Alarms
└── Composite alarms for alarm health
```
