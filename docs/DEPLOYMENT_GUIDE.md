# Deployment Guide

Complete guide for deploying CloudWatch monitoring infrastructure with AWS CDK.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [IAM Permissions Required](#iam-permissions-required)
- [Understanding AWS Profiles](#understanding-aws-profiles)
- [Quick Start (20 minutes)](#quick-start-20-minutes)
- [What Gets Deployed](#what-gets-deployed)
- [Testing Notifications](#testing-notifications)
- [Adding/Removing Resources](#addingremoving-resources)
- [Multiple Environments](#multiple-environments)
- [GitHub Actions (Automated Deployment)](#github-actions-automated-deployment)
- [Notification Channels](#notification-channels)
- [Adjusting Alarm Thresholds](#adjusting-alarm-thresholds)
- [Common Commands](#common-commands)
- [Cost Estimate](#cost-estimate)
- [Tearing Down / Removing Resources](#tearing-down--removing-resources)
- [Troubleshooting](#troubleshooting)
- [File Structure](#file-structure)
- [Next Steps](#next-steps)
- [Additional Documentation](#additional-documentation)
- [Support](#support)

## Overview

This CDK project deploys CloudWatch alarms for AWS resources. **Only resources you uncomment in `monitoring-stack.ts` will be deployed.**

Currently configured: **S3 monitoring only** (other services are commented out and ready to enable).

> **⚠️ Important: This is a Template Repository**
> 
> This repository is designed as a reference implementation and starting point. Before you begin:
> 
> 1. **For local deployment only:** You can clone directly and use it
> 2. **For GitHub Actions:** You MUST fork or create your own repository
>    - The GitHub Actions workflow is configured for the original repo
>    - OIDC trust policy is tied to the repository name
>    - You need your own repo to set up GitHub Secrets
> 
> **How to create your own copy:**
> - **Fork on GitHub** (recommended): Click "Fork" button, then clone your fork
> - **Download and re-initialize**: Download ZIP, remove `.git`, create new repo
> 
> See [Understanding AWS Profiles](#understanding-aws-profiles) section for more details on setup.

## Prerequisites

- Git
- Node.js 18+
- AWS CLI configured with a profile
- AWS CDK CLI: `npm install -g aws-cdk`
- AWS IAM permissions (see below)

## IAM Permissions Required

### For Local Testing (Quick Start)

**Option 1: Admin Access (Easiest for testing)**
- Attach `AdministratorAccess` policy to your IAM user
- ⚠️ **Not recommended for production or GitHub Actions**
- ✅ Good for: Local development and testing

**Option 2: Least Privilege (Recommended)**

Create a custom IAM policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKBootstrapPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "iam:*",
        "ssm:GetParameter",
        "ssm:PutParameter"
      ],
      "Resource": "*"
    },
    {
      "Sid": "MonitoringStackPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DeleteAlarms",
        "cloudwatch:DescribeAlarms",
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:GetTopicAttributes",
        "sns:SetTopicAttributes",
        "sns:ListSubscriptionsByTopic",
        "lambda:CreateFunction",
        "lambda:DeleteFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:GetRole",
        "iam:PassRole",
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

### For GitHub Actions (other environments)

GitHub Actions can authenticate to AWS using three methods:

**Option 1: OIDC with IAM Role (Recommended - Modern Approach)**
- No long-lived credentials stored in GitHub
- Uses OpenID Connect to assume an IAM role
- Most secure option
- Requires one-time setup of OIDC provider in AWS
- ✅ **Best practice for production**

**Option 2: IAM User with Access Keys (Traditional Approach)**
- Create dedicated IAM user with access keys
- Store keys as GitHub Secrets
- Simpler to set up initially
- ⚠️ Requires rotating access keys regularly
- ⚠️ Long-lived credentials are a security risk

**Option 3: Self-Hosted Runner with Instance Profile**
- Run GitHub Actions on your own EC2 instance
- Use EC2 instance profile for authentication
- No credentials in GitHub at all
- Requires managing your own runner infrastructure
- ✅ Good if you already have self-hosted runners

**For this project**: The GitHub Actions workflow is configured for OIDC authentication (recommended). For alternative authentication methods, see the "Alternative Authentication Methods" section in [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md).

### Permission Breakdown

| Service | Why Needed | Actions |
|---------|------------|---------|
| **CloudFormation** | Deploy/update stacks | Create, update, delete stacks |
| **CloudWatch** | Create alarms | PutMetricAlarm, DeleteAlarms |
| **SNS** | Notification topics | Create topics, manage subscriptions |
| **Lambda** | Slack/Teams forwarders | Create/update functions (if webhooks configured) |
| **IAM** | Service roles | Create roles for Lambda execution |
| **S3** | CDK assets + monitoring | Bootstrap bucket, read bucket metadata |
| **SSM** | CDK bootstrap | Store/retrieve bootstrap version |

### Security Best Practices

1. **Local Development**: Use admin access for speed, but understand the risks
2. **Staging/Production**: Use least privilege policy
3. **GitHub Actions**: Always use least privilege with dedicated IAM user
4. **Rotate Credentials**: Regularly rotate access keys
5. **MFA**: Enable MFA on IAM users with deployment permissions
6. **Audit**: Review CloudTrail logs for deployment activities

## Understanding AWS Profiles

**Important**: The AWS profile is specified via the `--profile` flag when running CDK commands, **not in the code**.

Your AWS profiles are configured in `~/.aws/credentials` and `~/.aws/config`. Example:

```ini
# ~/.aws/credentials
[dev]
aws_access_key_id = YOUR_DEV_KEY
aws_secret_access_key = YOUR_DEV_SECRET

[staging]
aws_access_key_id = YOUR_STAGING_KEY
aws_secret_access_key = YOUR_STAGING_SECRET
```

**How to use profiles**:
```bash
# Deploy to dev account
cdk deploy --context environment=dev --profile dev

# Deploy to staging account
cdk deploy --context environment=staging --profile staging

# Deploy to prod account
cdk deploy --context environment=prod --profile prod
```

**Important**: The `--context environment=<ENV>` value must match an environment defined in `lib/config/environment-config.ts`. Available environments in config now: `dev`, `staging`, `prod`.

**Verify which account a profile uses**:
```bash
aws sts get-caller-identity --profile dev
# Shows Account ID - should match your environment-config.ts
```

This approach keeps your code environment-agnostic and prevents accidentally deploying to the wrong account.

## Quick Start (20 minutes)

### Required Configuration

Before deployment, you must configure these 3 values:

1. **AWS Account ID** - Get with: `aws sts get-caller-identity --profile YOUR_PROFILE`
2. **Email Address** - For receiving alarm notifications
3. **S3 Bucket Name(s)** - Existing bucket(s) you want to monitor

**IAM Permissions Note**: For local testing, admin access is easiest. For production deployments, use the least privilege policy documented in the IAM Permissions section above.

### 1. Clone the Repository
```bash
git clone https://github.com/dspenard/cdk-cloudwatch-alarms.git && cd cdk-cloudwatch-alarms
```

> **Planning to use GitHub Actions?** Fork this repository first instead of cloning:
> 1. Click "Fork" on GitHub
> 2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/cdk-cloudwatch-alarms.git`
> 3. This gives you full control and allows GitHub Actions setup

### 2. Install Dependencies
```bash
npm install
```

### 3. Get Your AWS Account ID
```bash
aws sts get-caller-identity --profile YOUR_PROFILE
# Note the "Account" value
```

### 4. Configure Environment
Edit `lib/config/environment-config.ts`:
```typescript
dev: {
  accountId: '123456789012', // ← Your AWS account ID (REQUIRED)
  region: 'us-east-1',
  emailAddresses: ['your-email@example.com'], // ← Your email for alerts (REQUIRED)
}
```

**Important**: Both `accountId` and `emailAddresses` are required for deployment.

### 5. Configure Resources to Monitor
Edit `lib/stacks/monitoring-stack.ts`:

**For S3 (currently active):**
```typescript
const s3Buckets = [
  'my-actual-bucket-name',  // ← Replace with your bucket name (REQUIRED)
  'another-bucket',
];
```

**Important**: You must specify at least one existing S3 bucket name. Bucket must exist in us-east-1.

**To enable other services:**
- Uncomment the import at the top
- Uncomment the service section
- Replace example names with your resource names

See [Enabling Services](ENABLING_SERVICES.md) for details on each service.

**To enable other services:** Uncomment the import and code section in `monitoring-stack.ts`, update resource names, and deploy.

### 6. Bootstrap CDK (One-time)
```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile YOUR_PROFILE --context environment=<ENV>
```

**Note**: Replace `<ENV>` with your environment name from `environment-config.ts` (e.g., `dev`, `staging`, or `prod`).

### 7. Build the Project
```bash
npm run build
```

### 8. Preview Changes (Optional but Recommended)
```bash
cdk diff --context environment=<ENV> --profile YOUR_PROFILE
```

**Note**: Use the same `<ENV>` value that matches your configuration in `environment-config.ts`.
This shows you what resources will be created before actually deploying.

### 9. Deploy
```bash
cdk deploy --context environment=<ENV> --profile YOUR_PROFILE
```

**Note**: Replace `<ENV>` with your environment name (e.g., `dev`, `staging`, or `prod`).

Type `y` when prompted.

**After deployment**: Check your email inbox for an AWS SNS confirmation email. Click the confirmation link to start receiving alert notifications.

### 10. Verify Deployment (Optional)

**Check CloudFormation Stack:**
```bash
aws cloudformation describe-stacks --stack-name monitoring-<ENV> --profile YOUR_PROFILE --query 'Stacks[0].[StackName,StackStatus]' --output table
```

**Note**: Replace `<ENV>` with your environment name (stack name format is `monitoring-<ENV>`).Expected: `CREATE_COMPLETE`

**Check CloudWatch Alarms:**
```bash
aws cloudwatch describe-alarms --alarm-name-prefix "dev-s3-" --profile YOUR_PROFILE --query 'MetricAlarms[*].[AlarmName,StateValue]' --output table
```
Expected: Your alarms listed with status `OK` or `INSUFFICIENT_DATA`

**Check SNS Topics:**
```bash
aws sns list-topics --profile YOUR_PROFILE --query 'Topics[?contains(TopicArn, `dev-monitoring`)].TopicArn' --output table
```
Expected: Two topics listed (critical and warning)

**Or verify in AWS Console:**
- CloudFormation: https://console.aws.amazon.com/cloudformation
- CloudWatch Alarms: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
- SNS Topics: https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topics

## What Gets Deployed

CDK deploys **only what's uncommented** in `monitoring-stack.ts`:

### Always Deployed:
- 2 SNS topics (critical and warning alerts)
- Lambda functions (if Slack/Teams webhooks configured)

### Conditionally Deployed (based on what's uncommented):
- CloudWatch alarms for each resource you configure
- 2 alarms per S3 bucket (size + object count)
- 3 alarms per ECS service (CPU, memory, task count)
- 4 alarms per RDS instance (CPU, storage, latency)
- etc.

## Testing Notifications (Optional)

### Quick Test with Low Thresholds

For immediate testing, you can set very low thresholds that will trigger right away:

**Edit `lib/config/alarm-thresholds.ts`:**
```typescript
s3: {
  bucketSizeBytes: 1000000000000, // 1TB (production)
  numberOfObjects: 1, // 1 object (for testing - triggers immediately!)
}
```

**Edit `lib/stacks/monitoring-stack.ts`:**
```typescript
new S3Alarms(this, `${bucketName}Alarms`, {
  environment,
  bucketName,
  customSizeThreshold: 1 * 1024 * 1024, // 1 MB (for testing)
  alarmTopic: alertTopics.criticalAlarmTopic,
});
```

Then redeploy:
```bash
npm run build
cdk deploy --context environment=dev --profile YOUR_PROFILE
```

**Important:** S3 metrics update once per day, so even with low thresholds, you may need to wait up to 24 hours for the alarm to evaluate. For immediate testing, use SNS test below.

### Test SNS Notifications Directly

```bash
# Get SNS topic ARN from deployment outputs or CloudFormation
TOPIC_ARN="arn:aws:sns:us-east-1:ACCOUNT:dev-monitoring-critical-alerts"

# Send test message
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message '{"AlarmName":"Test","NewStateValue":"ALARM","NewStateReason":"Testing"}' \
  --profile YOUR_PROFILE
```

This sends an immediate test notification without waiting for S3 metrics.

## Adding/Removing Resources

### Add Resources
1. Edit `monitoring-stack.ts`
2. Add resource to the array or uncomment a service section
3. Deploy: `npm run build && cdk deploy --context environment=dev --profile dev`

### Remove Resources
1. Edit `monitoring-stack.ts`
2. Remove resource from array or comment out the section
3. Deploy: `npm run build && cdk deploy --context environment=dev --profile dev`

CDK automatically adds/removes alarms based on your configuration.

## Multiple Environments

### Deploy to Staging
```bash
# 1. Add staging account ID to environment-config.ts
# 2. Bootstrap staging account
cdk bootstrap aws://STAGING_ACCOUNT_ID/us-east-1 --profile staging

# 3. Deploy
cdk deploy --context environment=staging --profile staging
```

### Deploy to Production
```bash
# 1. Add prod account ID to environment-config.ts
# 2. Bootstrap prod account
cdk bootstrap aws://PROD_ACCOUNT_ID/us-east-1 --profile prod

# 3. Deploy
cdk deploy --context environment=prod --profile prod
```

## GitHub Actions (Automated Deployment)

After local deployment, you can set up automated deployments:

### 1. Create IAM User
- Name: `github-actions-cdk-deploy`
- Policy: `AdministratorAccess` (or custom)
- Create access key

### 2. Add GitHub Secrets
In your repo: Settings → Secrets and variables → Actions
- `AWS_ACCESS_KEY_ID_DEV`
- `AWS_SECRET_ACCESS_KEY_DEV`

### 3. Push Code
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 4. Verify
- Go to Actions tab in GitHub
- Watch deployment run automatically

See [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md) for detailed instructions.

## Notification Channels

### Email (Recommended - Configured in Code)
Add to `lib/config/environment-config.ts`:
```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  emailAddresses: ['team@example.com', 'oncall@example.com'],
}
```

After deployment, you'll receive a confirmation email from AWS SNS. Click the confirmation link to start receiving alerts.

**Note**: Email addresses are configured per environment, so you can have different recipients for dev, staging, and prod.

### SMS
Add to `lib/config/environment-config.ts`:
```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  emailAddresses: ['team@example.com'],
  smsPhoneNumbers: ['+12025551234'], // Must include country code
}
```

### Slack
1. Create webhook: https://api.slack.com/apps
2. Add to `lib/config/environment-config.ts`:
```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  emailAddresses: ['team@example.com'],
  slackWebhookUrl: 'https://hooks.slack.com/services/...',
}
```

> **⚠️ Note:** Slack integration has not been tested yet. See [Slack Integration](SLACK_INTEGRATION.md) for detailed setup instructions.

### Teams
1. Create webhook in Teams channel
2. Add to `lib/config/environment-config.ts`:
```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  emailAddresses: ['team@example.com'],
  teamsWebhookUrl: 'https://outlook.office.com/webhook/...',
}
```

> **⚠️ Note:** Teams integration has not been tested yet. See [Teams Integration](TEAMS_INTEGRATION.md) for detailed setup instructions.

### Manual Email Subscription (Alternative)
If you prefer not to configure emails in code, you can manually subscribe:

```bash
# Get SNS topic ARN
aws sns list-topics --profile YOUR_PROFILE --query 'Topics[?contains(TopicArn, `dev-monitoring-critical`)].TopicArn' --output text

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:dev-monitoring-critical-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --profile YOUR_PROFILE
```

**Note**: Manual subscriptions are not tracked in version control and must be repeated for each environment.

See [Notification Setup](NOTIFICATION_SETUP.md) for details.

## Adjusting Alarm Thresholds

Edit `lib/config/alarm-thresholds.ts`:
```typescript
s3: {
  bucketSizeBytes: 1000000000000, // 1TB
  numberOfObjects: 1000000,        // 1M objects
}
```

**For Testing (Low Thresholds):**
```typescript
s3: {
  bucketSizeBytes: 1000000000000, // Keep at 1TB or lower for testing
  numberOfObjects: 1, // 1 object - triggers immediately if bucket has objects
}
```

**For Production (Recommended):**
```typescript
s3: {
  bucketSizeBytes: 1000000000000, // 1TB or adjust based on your needs
  numberOfObjects: 1000000, // 1M objects or adjust based on your needs
}
```

You can also set custom thresholds per bucket in `monitoring-stack.ts`:
```typescript
new S3Alarms(this, 'MyBucketAlarms', {
  environment,
  bucketName: 'my-bucket',
  customSizeThreshold: 500 * 1024 * 1024 * 1024, // 500GB
  alarmTopic: alertTopics.criticalAlarmTopic,
});
```

Same thresholds apply to all environments (dev, staging, prod).

## Common Commands

```bash
# Build
npm run build

# Preview changes
cdk diff --context environment=<ENV> --profile <PROFILE>

# Deploy
cdk deploy --context environment=<ENV> --profile <PROFILE>

# Deploy without confirmation
cdk deploy --context environment=<ENV> --profile <PROFILE> --require-approval never

# Destroy (remove all resources)
cdk destroy --context environment=<ENV> --profile <PROFILE> --force

# View CloudFormation template
cdk synth --context environment=<ENV>
```

**Note**: 
- Replace `<ENV>` with your environment name from `environment-config.ts` (`dev`, `staging`, or `prod`)
- Replace `<PROFILE>` with your AWS CLI profile name
- The `--force` flag skips the confirmation prompt when destroying.

## Cost Estimate

### S3 Only (10 buckets)
- 20 alarms (first 10 free): $1.00/month
- SNS: $0.50/month
- **Total: ~$1.50/month**

### Multiple Services (~100 resources)
- ~250 alarms: $24.00/month
- SNS: $0.50/month
- Lambda: $0.20/month
- **Total: ~$25/month** (excluding SMS)

First 10 alarms are free, then $0.10 per alarm per month.

## Tearing Down / Removing Resources

### Option 1: Destroy via GitHub Actions (Recommended)

If you have GitHub Actions set up, you can destroy infrastructure through the GitHub UI:

1. Go to your repository's **Actions** tab
2. Click **"Destroy Monitoring Infrastructure"** workflow
3. Click **"Run workflow"** dropdown
4. Select the environment to destroy (dev, staging, or prod)
5. Type **"DESTROY"** (case-sensitive) in the confirmation field
6. Click **"Run workflow"**

**Safety features:**
- Manual trigger only (no automatic destruction)
- Requires typing "DESTROY" to confirm
- Uses GitHub environment protection rules (if configured)
- Provides summary of what was destroyed

**What gets deleted:**
- All CloudWatch alarms
- SNS topics and subscriptions
- Lambda functions (if Slack/Teams configured)
- CloudFormation stack

**What remains:**
- CDK bootstrap resources (S3 bucket, IAM roles) - these are shared and safe to keep
- CloudWatch Logs (will expire based on retention settings)

### Option 2: Destroy Locally via CLI

To completely remove all monitoring resources from an environment:

```bash
cdk destroy --context environment=<ENV> --profile YOUR_PROFILE --force
```

**Note**: Replace `<ENV>` with your environment name (`dev`, `staging`, or `prod`).

### Verify Deletion

```bash
# Check CloudFormation stack is gone
aws cloudformation describe-stacks --stack-name monitoring-<ENV> --profile YOUR_PROFILE
# Should return: "Stack with id monitoring-<ENV> does not exist"

# Check SNS topics are gone
aws sns list-topics --profile YOUR_PROFILE --query 'Topics[?contains(TopicArn, `<ENV>-monitoring`)]'
# Should return: empty list

# Check CloudWatch alarms are gone
aws cloudwatch describe-alarms --alarm-name-prefix "<ENV>-" --profile YOUR_PROFILE
# Should return: empty list or no <ENV>- prefixed alarms
```

**Note**: Replace `<ENV>` with your environment name.

### Tear Down Multiple Environments

**Via GitHub Actions:**
- Run the destroy workflow once for each environment

**Via CLI:**
```bash
# Remove dev
cdk destroy --context environment=dev --profile dev --force

# Remove staging
cdk destroy --context environment=staging --profile staging --force

# Remove prod
cdk destroy --context environment=prod --profile prod --force
```

### Partial Removal (Remove Specific Services)

To remove monitoring for specific services without destroying the entire stack:

1. Comment out the service section in `monitoring-stack.ts`
2. Redeploy:
```bash
npm run build
cdk deploy --context environment=dev --profile YOUR_PROFILE
```

CDK will automatically remove the commented-out resources.

---

## Troubleshooting

### "Need to perform AWS calls for account"
**Solution**: Bootstrap CDK
```bash
cdk bootstrap aws://ACCOUNT-ID/us-east-1 --profile YOUR_PROFILE
```

### "Bucket does not exist"
**Solution**: Verify bucket name is exact (case-sensitive) and in us-east-1

### "No data points" in CloudWatch
**Solution**: S3 metrics update once per day. Wait 24 hours after bucket creation.

### Build fails
**Solution**: Check TypeScript errors
```bash
npm run build
# Fix any errors shown
```

### Deployment fails
**Solution**: Check CloudFormation events in AWS Console for specific error

## File Structure

```
lib/
├── config/
│   ├── environment-config.ts    ← Edit: Add account IDs
│   └── alarm-thresholds.ts      ← Edit: Adjust thresholds (optional)
├── stacks/
│   └── monitoring-stack.ts      ← Edit: Configure resources to monitor
└── constructs/
    ├── alarms/                  ← Don't edit: Alarm logic
    └── notifications/           ← Don't edit: Notification logic
```

## Next Steps

1. ✅ Deploy to dev and verify
2. ✅ Test notifications
3. ✅ Adjust thresholds if needed
4. ✅ Enable additional services (uncomment in monitoring-stack.ts)
5. ✅ Set up GitHub Actions for automated deployment
6. ✅ Deploy to staging and prod

## Additional Documentation

- **[Enabling Services](ENABLING_SERVICES.md)** - How to enable ECS, RDS, ELB, etc.
- **[GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md)** - Automated deployment (includes alternative methods)
- **[Notification Setup](NOTIFICATION_SETUP.md)** - SMS, Email, Slack, Teams setup
- **[Examples](EXAMPLES.md)** - Code examples for all services
- **[Architecture](ARCHITECTURE.md)** - System architecture and design

## Support

- Check CloudFormation events for deployment errors
- Check Lambda CloudWatch Logs for notification issues
- Review alarm configuration in CloudWatch console
- See troubleshooting section above

---

**Key Principle**: Only resources uncommented in `monitoring-stack.ts` will be deployed. Start with S3, add more services as needed.
