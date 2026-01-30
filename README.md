# CDK Monitoring Infrastructure

CloudWatch monitoring and alerting infrastructure for dev, staging, and prod environments using AWS CDK.

## Quick Start

**Deploy in 20 minutes** → See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

The project is pre-configured for S3 monitoring as a simple, focused demonstration. **Only resources you uncomment in `monitoring-stack.ts` will be deployed.**

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

## Setup Steps

1. **Install**: `npm install`
2. **Configure**: Add AWS account ID and email to `lib/config/environment-config.ts`
3. **Add Resources**: Edit `lib/stacks/monitoring-stack.ts` with your resource names
4. **Bootstrap**: `cdk bootstrap aws://ACCOUNT-ID/us-east-1 --profile YOUR_PROFILE --context environment=dev`
5. **Deploy**: `npm run build && cdk deploy --context environment=dev --profile YOUR_PROFILE`
6. **Confirm Email**: Check inbox for AWS SNS confirmation email and click the link

**IAM Permissions**: Your AWS profile needs CloudFormation, CloudWatch, SNS, and IAM permissions. For local testing, admin access is easiest. For production, use least privilege policy (see deployment guide).

**Note**: AWS profile is specified via `--profile` flag in commands, not in code. See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for complete instructions.

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
cdk diff --context environment=dev --profile dev

# Deploy
cdk deploy --context environment=dev --profile dev

# Destroy
cdk destroy --context environment=dev --profile dev
```

## Cost Estimate

- **S3 only (10 buckets)**: ~$1.50/month
- **Multiple services (~100 resources)**: ~$25/month
- First 10 alarms free, then $0.10 per alarm per month

## Support

For issues or questions:
- Check [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) troubleshooting section
- Review CloudFormation events in AWS Console
- Check Lambda CloudWatch Logs for notification issues
