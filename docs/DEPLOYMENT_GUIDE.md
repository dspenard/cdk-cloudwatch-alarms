# Deployment Guide

Complete guide for deploying CloudWatch monitoring infrastructure with AWS CDK.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [IAM Permissions Required](#iam-permissions-required)
- [Understanding AWS Profiles](#understanding-aws-profiles)
- [Deployment Steps](#deployment-steps)
- [What Gets Deployed](#what-gets-deployed)
- [Testing Notifications](#testing-notifications)
- [Enabling Additional Services](#enabling-additional-services)
- [Multiple Environments](#multiple-environments)
- [Notification Channels](#notification-channels)
- [Adjusting Alarm Thresholds](#adjusting-alarm-thresholds)
- [Tearing Down Resources](#tearing-down-resources)
- [Common Commands](#common-commands)
- [Cost Estimate](#cost-estimate)
- [Troubleshooting](#troubleshooting)
- [Support](#support)

## Overview

This CDK project deploys CloudWatch alarms for AWS resources. **Only resources you uncomment in `lib/stacks/monitoring-stack.ts` will be deployed.**

Currently configured: **S3 monitoring only** (other services are commented out and ready to enable).

> **Note:** If you plan to use GitHub Actions for deployment, you'll need to fork this repository first. See [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md) for details.

## Prerequisites

Before you begin, ensure you have:

- **Git** - [Install Git](https://git-scm.com/downloads)
- **Node.js 18+** - [Install Node.js](https://nodejs.org/) (LTS version recommended)
- **AWS CLI** - [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and [configure a profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- **AWS CDK CLI** - Install after Node.js: `npm install -g aws-cdk`
- **AWS IAM permissions** - See section below

## IAM Permissions Required

**For Local Testing:**
- **Admin Access** (easiest): Attach `AdministratorAccess` policy to your IAM user
- **Least Privilege** (recommended for production): Use the custom policy below

**For GitHub Actions:**
- See [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md) for authentication options and required permissions

### Least Privilege Policy

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
# Shows Account ID - should match your lib/config/environment-config.ts
```

This approach keeps your code environment-agnostic and prevents accidentally deploying to the wrong account.

## Deployment Steps

### Required Configuration

Before deployment, you must configure these 3 values:

1. **AWS Account ID** - Get with: `aws sts get-caller-identity --profile YOUR_PROFILE`
2. **Email Address** - For receiving alarm notifications
3. **S3 Bucket Name(s)** - Existing bucket(s) you want to monitor

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

**To enable other services:** See [Enabling Services](ENABLING_SERVICES.md) for details.

### 6. Bootstrap CDK (One-time)
```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile YOUR_PROFILE --context environment=<ENV>
```

Replace `<ENV>` with your environment name from `lib/config/environment-config.ts` (e.g., `dev`, `staging`, or `prod`).

### 7. Build the Project
```bash
npm run build
```

### 8. Preview Changes (Optional but Recommended)
```bash
cdk diff --context environment=<ENV> --profile YOUR_PROFILE
```

This shows you what resources will be created before actually deploying.

### 9. Deploy
```bash
cdk deploy --context environment=<ENV> --profile YOUR_PROFILE
```

Type `y` when prompted.

**After deployment**: Check your email inbox for an AWS SNS confirmation email. Click the confirmation link to start receiving alert notifications.

### 10. Verify Deployment (Optional)

**Check CloudFormation Stack:**
```bash
aws cloudformation describe-stacks --stack-name monitoring-<ENV> --profile YOUR_PROFILE --query 'Stacks[0].[StackName,StackStatus]' --output table
```

Expected: `CREATE_COMPLETE`

**Check CloudWatch Alarms:**
```bash
aws cloudwatch describe-alarms --alarm-name-prefix "<ENV>-s3-" --profile YOUR_PROFILE --query 'MetricAlarms[*].[AlarmName,StateValue]' --output table
```

Expected: Your alarms listed with status `OK` or `INSUFFICIENT_DATA`

**Check SNS Topics:**
```bash
aws sns list-topics --profile YOUR_PROFILE --query 'Topics[?contains(TopicArn, `<ENV>-monitoring`)].TopicArn' --output table
```

Expected: Two topics listed (critical and warning)

**Or verify in AWS Console:**
- CloudFormation: https://console.aws.amazon.com/cloudformation
- CloudWatch Alarms: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:
- SNS Topics: https://console.aws.amazon.com/sns/v3/home?region=us-east-1#/topics

## What Gets Deployed

CDK deploys **only what's uncommented** in `lib/stacks/monitoring-stack.ts`:

### Always Deployed:
- 2 SNS topics (critical and warning alerts)
- SNS email subscriptions (one per email address per topic)
- Lambda functions (only if Slack/Teams webhooks are configured in `lib/config/environment-config.ts`)

### Conditionally Deployed (based on what's uncommented):
- CloudWatch alarms for each resource you configure
- 2 alarms per S3 bucket (size + object count)
- 3 alarms per ECS service (CPU, memory, task count)
- 5 alarms per RDS instance (CPU, connections, storage, read/write latency)
- 5 alarms per ELB (target response time, unhealthy targets, HTTP errors, rejected connections)
- And more (see [Enabling Services](ENABLING_SERVICES.md) for complete list)

## Testing Notifications

### Test SNS Notifications Directly

```bash
# Get SNS topic ARN from deployment outputs
TOPIC_ARN="arn:aws:sns:us-east-1:ACCOUNT_ID:<ENV>-monitoring-critical-alerts"

# Send test message
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --subject "ALARM: Test Notification" \
  --message "This is a test notification from your CloudWatch monitoring system. If you receive this email, your notifications are configured correctly." \
  --profile YOUR_PROFILE
```

This sends an immediate test notification to verify your email subscription is working.

**Note**: S3 metrics update once per day, so actual S3 alarms may take up to 24 hours to evaluate after deployment.

## Enabling Additional Services

To add monitoring for other AWS services beyond S3, see [Enabling Services](ENABLING_SERVICES.md).

The guide covers:
- How to enable each service (ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF)
- Resource naming requirements
- Alarm counts and costs per service
- Managing multiple resources at scale

## Multiple Environments

Deploy the same monitoring infrastructure to multiple AWS accounts (dev, staging, prod) using local CLI commands.

> **Note:** This section covers manual deployment from your local machine. For automated deployment via GitHub Actions, see [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md).

**Prerequisites:**
1. Add account IDs to `lib/config/environment-config.ts`
2. Configure AWS CLI profiles for each account (`~/.aws/credentials`)
3. Bootstrap each account (one-time operation)

**Deploy to staging:**
```bash
# Bootstrap (one-time)
cdk bootstrap aws://STAGING_ACCOUNT_ID/us-east-1 --profile staging --context environment=staging

# Deploy
cdk deploy --context environment=staging --profile staging
```

**Deploy to production:**
```bash
# Bootstrap (one-time)
cdk bootstrap aws://PROD_ACCOUNT_ID/us-east-1 --profile prod --context environment=prod

# Deploy
cdk deploy --context environment=prod --profile prod
```

## Notification Channels

Configure how you receive alarm notifications. See [Notification Setup](NOTIFICATION_SETUP.md) for complete instructions on:

- Email notifications (configured in code)
- SMS notifications
- Slack integration
- Microsoft Teams integration
- Manual SNS subscriptions

All notification channels are configured in `lib/config/environment-config.ts` and can be different per environment.

## Adjusting Alarm Thresholds

Default thresholds are defined in `lib/config/alarm-thresholds.ts`:

```typescript
s3: {
  bucketSizeBytes: 1000000000000, // 1TB
  numberOfObjects: 1000000,        // 1M objects
}
```

You can also set custom thresholds per resource in `lib/stacks/monitoring-stack.ts`:

```typescript
new S3Alarms(this, 'MyBucketAlarms', {
  environment,
  bucketName: 'my-bucket',
  customSizeThreshold: 500 * 1024 * 1024 * 1024, // 500GB
  alarmTopic: alertTopics.criticalAlarmTopic,
});
```

After changing thresholds, redeploy:
```bash
npm run build
cdk deploy --context environment=<ENV> --profile YOUR_PROFILE
```

## Tearing Down Resources

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

### Partial Removal (Remove Specific Services)

To remove monitoring for specific services without destroying the entire stack:

1. Comment out the service section in `lib/stacks/monitoring-stack.ts`
2. Redeploy:
```bash
npm run build
cdk deploy --context environment=<ENV> --profile YOUR_PROFILE
```

CDK will automatically remove the commented-out resources.

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
- Replace `<ENV>` with your environment name from `lib/config/environment-config.ts` (`dev`, `staging`, or `prod`)
- Replace `<PROFILE>` with your AWS CLI profile name
- The `--force` flag skips the confirmation prompt when destroying

## Cost Estimate

### S3 Only (10 buckets)
- 20 alarms (first 10 free): $1.00/month
- SNS: $0.50/month
- **Total: ~$1.50/month**

### Multiple Services (many resources)
- ~250 alarms: $24.00/month
- SNS: $0.50/month
- Lambda: $0.20/month
- **Total: ~$25/month** (excluding SMS)

First 10 alarms are free, then $0.10 per alarm per month.

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

## Support

**Deployment Issues:**
- Check CloudFormation console for stack events and error messages
- Verify IAM permissions match the requirements above
- Ensure AWS CLI profile is configured correctly
- Review the Troubleshooting section above

**Notification Issues:**
- Verify email confirmation was completed (check spam folder)
- Check Lambda CloudWatch Logs for Slack/Teams forwarder errors
- Test SNS topics directly using the command in Testing Notifications section

**Alarm Issues:**
- Verify resources exist in the correct region (us-east-1)
- Check CloudWatch console for alarm state and evaluation history
- Remember S3 metrics update once per day
