# Notification Setup Guide

Quick reference for setting up all notification channels.

## Table of Contents

- [Overview](#overview)
- [Quick Setup](#quick-setup)
  - [SMS Notifications](#1-sms-notifications)
  - [Email Notifications](#2-email-notifications)
  - [Slack Notifications](#3-slack-notifications)
  - [Microsoft Teams Notifications](#4-microsoft-teams-notifications)
- [Complete Configuration Example](#complete-configuration-example)
- [Testing Notifications](#testing-notifications)
- [Notification Routing Strategies](#notification-routing-strategies)
- [Cost Considerations](#cost-considerations)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Overview

This CDK project supports multiple notification channels:
- **SMS** - Direct text messages via SNS
- **Email** - Email notifications via SNS
- **Slack** - Slack channel notifications
- **Microsoft Teams** - Teams channel notifications

You can enable any combination of these channels.

## Quick Setup

### 1. SMS Notifications

Edit `lib/config/environment-config.ts`:

```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  smsPhoneNumbers: ['+12025551234', '+12025555678'],
},
```

**Note**: Phone numbers must be in E.164 format (+country code + number)

### 2. Email Notifications

Edit `lib/config/environment-config.ts`:

```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  emailAddresses: ['team@example.com', 'oncall@example.com'],
},
```

**Note**: Recipients will receive a confirmation email from AWS SNS that they must click to confirm the subscription.

**Alternative - Manual Subscription**: If you prefer not to configure emails in code, you can manually subscribe via CLI:

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

Manual subscriptions are not tracked in version control and must be repeated for each environment.

### 3. Slack Notifications

**Option A: AWS Chatbot (No code changes)**
1. Go to AWS Chatbot console
2. Configure Slack workspace
3. Create channel configuration
4. Select SNS topics created by this stack

**Option B: Webhook (Included in code)**
1. Create Slack incoming webhook: https://api.slack.com/apps
2. Add to `lib/config/environment-config.ts`:

```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
},
```

See `SLACK_INTEGRATION.md` for detailed instructions.

### 4. Microsoft Teams Notifications

**Option A: AWS Chatbot (No code changes)**
1. Go to AWS Chatbot console
2. Configure Microsoft Teams
3. Create channel configuration
4. Select SNS topics created by this stack

**Option B: Webhook (Included in code)**
1. Create Teams incoming webhook in your channel
2. Add to `lib/config/environment-config.ts`:

```typescript
dev: {
  accountId: '123456789012',
  region: 'us-east-1',
  teamsWebhookUrl: 'https://outlook.office.com/webhook/...',
},
```

See `TEAMS_INTEGRATION.md` for detailed instructions.

## Complete Configuration Example

```typescript
// lib/config/environment-config.ts
export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  dev: {
    accountId: '111111111111',
    region: 'us-east-1',
    emailAddresses: ['dev-team@example.com'],
    smsPhoneNumbers: ['+12025551234'],
    slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
    teamsWebhookUrl: 'https://outlook.office.com/webhook/...',
  },
  staging: {
    accountId: '222222222222',
    region: 'us-east-1',
    emailAddresses: ['staging-team@example.com'],
    smsPhoneNumbers: ['+12025551234'],
    slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/YYY',
  },
  prod: {
    accountId: '333333333333',
    region: 'us-east-1',
    emailAddresses: ['oncall@example.com', 'team@example.com'],
    smsPhoneNumbers: ['+12025551234', '+12025555678'],
    slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/ZZZ',
    teamsWebhookUrl: 'https://outlook.office.com/webhook/...',
  },
};
```

All notification settings are now configured in `environment-config.ts` for consistency and version control.

## Testing Notifications

After deployment, test each channel:

```bash
# Get the SNS topic ARN from CloudFormation outputs
aws cloudformation describe-stacks \
  --stack-name monitoring-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CriticalTopicArn`].OutputValue' \
  --output text \
  --profile dev

# Publish a test message
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:monitoring-critical-alerts-dev \
  --message '{"AlarmName":"Test Alarm","NewStateValue":"ALARM","NewStateReason":"Testing notifications","Region":"us-east-1","StateChangeTime":"2024-01-29T10:30:00.000Z","AlarmDescription":"This is a test"}' \
  --profile dev
```

You should receive notifications on all configured channels.

## Notification Routing Strategies

### Strategy 1: All Channels for Critical Alarms
```
Critical Alarms → SMS + Slack + Teams + Email
Warning Alarms → Slack + Email
```

### Strategy 2: Environment-Based Routing
```
Production → SMS + Slack + Teams
Staging → Slack + Email
Dev → Slack only
```

### Strategy 3: Service-Based Routing
```
Database Alarms → #database-alerts Slack channel
Compute Alarms → #compute-alerts Slack channel
Network Alarms → #network-alerts Slack channel
```

### Strategy 4: Time-Based Routing
```
Business Hours → Slack + Teams
After Hours → SMS + Slack
```

## Cost Considerations

### SMS Costs
- ~$0.00645 per SMS in US
- 100 alarms/day = ~$19/month
- Consider using only for critical prod alarms

### Email Costs
- First 1,000 emails free
- $0.10 per 1,000 emails after
- Essentially free for most use cases

### Slack/Teams Webhooks
- Free (no AWS charges)
- Rate limits apply (1 msg/sec for Slack)

### Lambda Costs
- First 1M requests free
- $0.20 per 1M requests after
- Essentially free for alarm forwarding

## Security Best Practices

1. **Webhook URLs**
   - Never commit webhook URLs to git
   - Use AWS Secrets Manager for production
   - Rotate webhooks periodically

2. **Phone Numbers**
   - Use environment variables or Secrets Manager
   - Don't hardcode in source

3. **IAM Permissions**
   - Use least privilege for Lambda functions
   - Restrict SNS publish permissions

4. **Monitoring**
   - Monitor Lambda execution errors
   - Set up dead letter queues
   - Alert on notification failures

## Troubleshooting

### SMS not received
- Verify phone number format (E.164)
- Check SNS subscription status
- Verify SMS opt-in (for US numbers)
- Check AWS SNS quotas

### Email not received
- Check spam folder
- Verify SNS subscription confirmed
- Check email address format

### Slack messages not appearing
- Verify webhook URL is active
- Check Lambda CloudWatch Logs
- Test webhook with curl
- Check Slack rate limits

### Teams messages not appearing
- Verify webhook URL is active
- Check Lambda CloudWatch Logs
- Test webhook with curl
- Verify Teams connector is enabled

## Next Steps

1. Configure your preferred notification channels
2. Deploy to dev environment
3. Test all notification channels
4. Adjust alarm thresholds if needed
5. Deploy to staging and prod
6. Set up on-call rotation
7. Document runbooks for common alarms
