# CDK Monitoring and Alerting Infrastructure

CloudWatch monitoring and alerting infrastructure for multiple environments using AWS CDK with TypeScript.

> **📋 This is a template repository** - Clone or fork this repo to create your own monitoring infrastructure. This repository is meant as a reference implementation and starting point for your own project.

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

> **⚠️ Before you begin:** This is a template repository. Fork or clone it to your own GitHub account before making changes. See [Setup Overview](#setup-overview) below for details.

**Deploy in 20 minutes** → See [DEPLOYMENT_GUIDE](docs/DEPLOYMENT_GUIDE.md)

The project is pre-configured for only S3 monitoring as a simple, focused demonstration. **Only resources you uncomment in `monitoring-stack.ts` will be deployed.**

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

See [DEPLOYMENT_GUIDE](docs/DEPLOYMENT_GUIDE.md) for step-by-step instructions.

## What You Get

- CloudWatch alarms for AWS resources (S3 at the moment, but code has been shelled out for ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF)
- SNS notifications (SMS, Email, Slack, Teams)
- Multi-environment support (dev, staging, prod)
- **Local deployment** (default) - Deploy from your machine using AWS CLI
- **GitHub Actions** (optional) - Automated deployment with OIDC authentication

See architecture diagrams in [ARCHITECTURE](docs/ARCHITECTURE.md)

## Setup Overview

> **Important:** This is a template repository. You should create your own copy before making changes:
> 
> **Option 1: Fork this repository** (recommended for GitHub Actions)
> - Click "Fork" button on GitHub
> - Clone your fork: `git clone https://github.com/YOUR_USERNAME/cdk-cloudwatch-alarms.git`
> - This gives you your own repository with full control
> 
> **Option 2: Download and create new repo**
> - Download as ZIP or clone: `git clone https://github.com/dspenard/cdk-cloudwatch-alarms.git`
> - Remove git history: `rm -rf .git`
> - Create your own repo: `git init && git add . && git commit -m "Initial commit"`
> - Push to your own GitHub repository

**This is merely a quick summary** - Please see [DEPLOYMENT_GUIDE](docs/DEPLOYMENT_GUIDE.md) for complete step-by-step instructions.

### 1. Clone the Repository
```bash
git clone https://github.com/dspenard/cdk-cloudwatch-alarms.git && cd cdk-cloudwatch-alarms
```

> **Note:** If you plan to use GitHub Actions, fork this repository first instead of cloning directly. See [Setup Overview](#setup-overview) above.
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

See [ENABLING_SERVICES](docs/ENABLING_SERVICES.md) for details.

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

scripts/
└── setup-oidc.sh                ← Automated GitHub Actions OIDC setup
```

## Documentation

**Getting Started:**
- **[DEPLOYMENT_GUIDE](docs/DEPLOYMENT_GUIDE.md)** - Complete local deployment guide (start here!)
- **[ENABLING_SERVICES](docs/ENABLING_SERVICES.md)** - How to enable ECS, RDS, ELB, and other services
- **[EXAMPLES](docs/EXAMPLES.md)** - Code examples for all supported services

**Automation & CI/CD (Optional):**
- **[GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md)** - Automated deployment with OIDC (includes quick start and alternative methods)

**Notifications:**
- **[NOTIFICATION_SETUP](docs/NOTIFICATION_SETUP.md)** - SMS, Email, Slack, Teams setup
- **[SLACK_INTEGRATION](docs/SLACK_INTEGRATION.md)** - Detailed Slack integration guide
- **[TEAMS_INTEGRATION](docs/TEAMS_INTEGRATION.md)** - Detailed Teams integration guide

**Architecture:**
- **[ARCHITECTURE](docs/ARCHITECTURE.md)** - System architecture and design decisions

## Common Commands

```bash
# Build
npm run build

# Preview changes
cdk diff --context environment=<ENV> --profile <PROFILE>

# Deploy
cdk deploy --context environment=<ENV> --profile <PROFILE>

# Destroy (remove all resources)
cdk destroy --context environment=<ENV> --profile <PROFILE> --force
```

**Note**: Replace `<ENV>` with `dev`, `staging`, or `prod` (must match `environment-config.ts`).

**GitHub Actions**: You can also deploy and destroy via GitHub Actions workflows. See [GitHub Actions Setup](docs/GITHUB_ACTIONS_SETUP.md) for details.

## Cost Estimate

- **S3 only (10 buckets)**: ~$1.50/month
- **Multiple services (~100 resources)**: ~$25/month
- First 10 alarms free, then $0.10 per alarm per month

## Support

For issues or questions:
- Check [DEPLOYMENT_GUIDE](docs/DEPLOYMENT_GUIDE.md) troubleshooting section
- Review CloudFormation events in AWS Console
- Check Lambda CloudWatch Logs for notification issues
