# CDK Monitoring Infrastructure

CloudWatch monitoring and alerting infrastructure for dev, staging, and prod environments using AWS CDK.

## Table of Contents

- [Quick Start](#quick-start)
- [What You Get](#what-you-get)
- [Setup Overview](#setup-overview)
- [Key Principle](#key-principle)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Common Commands](#common-commands)
- [Cost Estimate](#cost-estimate)
- [Support](#support)

## Quick Start

**Deploy in 20 minutes** → See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

The project is pre-configured for S3 monitoring as a simple, focused demonstration. **Only resources you uncomment in `monitoring-stack.ts` will be deployed.**

### Prerequisites

- Git
- Node.js 18+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`

### Required Configuration (3 values)

Before first deployment, you must configure:

1. **AWS Account ID** in `lib/config/environment-config.ts`
2. **Email Address** in `lib/config/environment-config.ts`
3. **S3 Bucket Name(s)** in `lib/stacks/monitoring-stack.ts`

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for step-by-step instructions.

## What You Get

- CloudWatch alarms for AWS resources (S3 at the moment, but code has been shelled out for ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF)
- SNS notifications (SMS, Email; Slack and Teams not tested yet)
- Multi-environment support (dev, staging, prod) but only a local deployment as been tested so far
- GitHub Actions for automated deployment (not tested yet)

See architecture diagrams in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Setup Overview

**This is merely a quick summary** - Please see [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

1. **Clone**: `git clone https://github.com/dspenard/cdk-setup-for-cloudwatch-alerts.git && cd cdk-setup-for-cloudwatch-alerts`
2. **Install**: `npm install`
3. **Configure**: Add AWS account ID and email to `lib/config/environment-config.ts`
4. **Add Resources**: Edit `lib/stacks/monitoring-stack.ts` with your resource names
5. **Bootstrap**: `cdk bootstrap aws://ACCOUNT-ID/us-east-1 --profile YOUR_PROFILE --context environment=<ENV>`
6. **Deploy**: `npm run build && cdk deploy --context environment=<ENV> --profile YOUR_PROFILE`
7. **Confirm Email**: Check inbox for AWS SNS confirmation email and click the link

**Environment Context**: Replace `<ENV>` with your environment name from `environment-config.ts` (`dev`, `staging`, or `prod`).

**IAM Permissions**: Your AWS profile needs CloudFormation, CloudWatch, SNS, and IAM permissions. For local testing, admin access is easiest. For production, use least privilege policy (see deployment guide).

**Note**: AWS profile is specified via `--profile` flag in commands, not in code.

## Key Principle

**Only resources uncommented in `monitoring-stack.ts` will be deployed.**

- **Currently active**: S3 monitoring
- **Ready to enable**: ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF

To enable a service: Uncomment the import and code section, update resource names, deploy.

See [docs/ENABLING_SERVICES.md](docs/ENABLING_SERVICES.md) for details.

## Project Structure

```
lib/
├── config/
│   ├── environment-config.ts    ← Add your AWS account IDs
│   └── alarm-thresholds.ts      ← Adjust alarm thresholds (optional)
├── stacks/
│   └── monitoring-stack.ts      ← Configure which resources to monitor
└── constructs/
    ├── alarms/                  ← Alarm logic for each service
    └── notifications/           ← SNS, Slack, Teams integration
```

## Documentation

**Getting Started:**
- **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Complete deployment guide with all steps
- **[docs/ENABLING_SERVICES.md](docs/ENABLING_SERVICES.md)** - How to enable ECS, RDS, ELB, and other services
- **[docs/EXAMPLES.md](docs/EXAMPLES.md)** - Code examples for all supported services

**Automation & CI/CD:**
- **[docs/GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md)** - Automated deployment with GitHub Actions

**Notifications:**
- **[docs/NOTIFICATION_SETUP.md](docs/NOTIFICATION_SETUP.md)** - SMS, Email, Slack, Teams setup
- **[docs/SLACK_INTEGRATION.md](docs/SLACK_INTEGRATION.md)** - Detailed Slack integration guide
- **[docs/TEAMS_INTEGRATION.md](docs/TEAMS_INTEGRATION.md)** - Detailed Teams integration guide

**Architecture:**
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design decisions

## Common Commands

```bash
# Build
npm run build

# Preview changes
cdk diff --context environment=<ENV> --profile <PROFILE>

# Deploy
cdk deploy --context environment=<ENV> --profile <PROFILE>

# Destroy
cdk destroy --context environment=<ENV> --profile <PROFILE>
```

**Note**: Replace `<ENV>` with `dev`, `staging`, or `prod` (must match `environment-config.ts`).

## Cost Estimate

- **S3 only (10 buckets)**: ~$1.50/month
- **Multiple services (~100 resources)**: ~$25/month
- First 10 alarms free, then $0.10 per alarm per month

## Support

For issues or questions:
- Check [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) troubleshooting section
- Review CloudFormation events in AWS Console
- Check Lambda CloudWatch Logs for notification issues
