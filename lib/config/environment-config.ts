export interface EnvironmentConfig {
  accountId: string;
  region: string;
  snsTopicArn?: string; // Optional: if you want to use existing SNS topics
  teamsWebhookUrl?: string; // Optional: for Teams integration
  slackWebhookUrl?: string; // Optional: for Slack integration
  smsPhoneNumbers?: string[]; // Optional: phone numbers for SMS alerts
  emailAddresses?: string[]; // Optional: email addresses for email alerts
}

export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  dev: {
    accountId: '', // TODO: Add your dev account ID
    region: 'us-east-1',
    emailAddresses: [''], // TODO: Add your email for alert notifications
    // snsTopicArn: 'arn:aws:sns:us-east-1:ACCOUNT_ID:monitoring-alerts-dev',
    // teamsWebhookUrl: '', // TODO: Add Teams webhook URL
    // slackWebhookUrl: '', // TODO: Add Slack webhook URL
    // smsPhoneNumbers: ['+1234567890'],
  },
  staging: {
    accountId: '', // TODO: Add your staging account ID
    region: 'us-east-1',
    // emailAddresses: ['team@example.com'], // TODO: Add email addresses
    // snsTopicArn: 'arn:aws:sns:us-east-1:ACCOUNT_ID:monitoring-alerts-staging',
    // teamsWebhookUrl: '', // TODO: Add Teams webhook URL
    // slackWebhookUrl: '', // TODO: Add Slack webhook URL
    // smsPhoneNumbers: ['+1234567890'],
  },
  prod: {
    accountId: '', // TODO: Add your prod account ID
    region: 'us-east-1',
    // emailAddresses: ['team@example.com'], // TODO: Add email addresses
    // snsTopicArn: 'arn:aws:sns:us-east-1:ACCOUNT_ID:monitoring-alerts-prod',
    // teamsWebhookUrl: '', // TODO: Add Teams webhook URL
    // slackWebhookUrl: '', // TODO: Add Slack webhook URL
    // smsPhoneNumbers: ['+1234567890'],
  },
};

export function getEnvironmentConfig(environment: string): EnvironmentConfig {
  const config = ENVIRONMENT_CONFIGS[environment];
  if (!config) {
    throw new Error(
      `Unknown environment: ${environment}. Valid environments are: ${Object.keys(
        ENVIRONMENT_CONFIGS
      ).join(', ')}`
    );
  }
  return config;
}
