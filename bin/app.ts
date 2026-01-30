#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { getEnvironmentConfig } from '../lib/config/environment-config';

const app = new cdk.App();

// Get environment from context (passed via --context environment=dev)
const environment = app.node.tryGetContext('environment');

if (!environment) {
  throw new Error(
    'Environment must be specified via context: cdk deploy --context environment=dev'
  );
}

// Get environment-specific configuration
const envConfig = getEnvironmentConfig(environment);

// Create the monitoring stack
new MonitoringStack(app, `MonitoringStack-${environment}`, {
  env: {
    account: envConfig.accountId,
    region: envConfig.region,
  },
  environment,
  smsPhoneNumbers: envConfig.smsPhoneNumbers,
  emailAddresses: envConfig.emailAddresses,
  stackName: `monitoring-${environment}`,
  description: `CloudWatch monitoring and alerting for ${environment} environment`,
  tags: {
    Environment: environment,
    ManagedBy: 'CDK',
    Project: 'Monitoring',
  },
});

app.synth();
