# GitHub Actions Setup Guide

This guide walks you through setting up secure OIDC authentication for GitHub Actions to deploy your CDK monitoring stack.

> **⚠️ Before You Begin:** 
> - This guide assumes you've **forked this repository** to your own GitHub account
> - GitHub Actions won't work on the original template repository
> - The OIDC trust policy must match YOUR repository name

> **Note:** GitHub Actions deployment is **optional**. This project works great with local deployment using `cdk deploy`. Only set up GitHub Actions if you want automated deployments on push to main.

## Table of Contents

- [Why OIDC?](#why-oidc)
- [Prerequisites](#prerequisites)
- [Quick Start (15 minutes)](#quick-start-15-minutes)
- [Manual Setup Steps](#manual-setup-steps)
- [GitHub Configuration](#github-configuration)
- [Testing Your Setup](#testing-your-setup)
- [Troubleshooting](#troubleshooting)
- [Multiple Environments](#multiple-environments)
- [Security Best Practices](#security-best-practices)
- [Alternative Authentication Methods](#alternative-authentication-methods)
- [Destroying Infrastructure via GitHub Actions](#destroying-infrastructure-via-github-actions)

## Why OIDC?

✅ **No long-lived credentials** - No access keys to manage or rotate  
✅ **Automatic credential rotation** - AWS handles it automatically  
✅ **More secure** - Credentials never leave AWS  
✅ **AWS best practice** - Recommended by AWS security team  

## Prerequisites

- AWS CLI configured with a profile
- Permissions to create IAM roles and policies in your AWS account
- Access to your GitHub repository settings

## Quick Start (15 minutes)

Get GitHub Actions working in 15 minutes with secure OIDC authentication.

### Step 1: Run Setup Script (5 minutes)

```bash
./scripts/setup-oidc.sh
```

**What it does:**
- Creates OIDC provider in AWS
- Creates IAM role `GitHubActionsCDKDeploy`
- Creates and attaches least-privilege policy `GitHubActionsCDKDeployPolicy`
- Outputs the Role ARN you need

**Save the Role ARN** - it looks like:
```
arn:aws:iam::123456789012:role/GitHubActionsCDKDeploy
```

### Step 2: Add GitHub Secret (2 minutes)

1. Go to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add:
   - **Name:** `AWS_ROLE_ARN_DEV`
   - **Value:** Your Role ARN from Step 1
4. Click **"Add secret"**

### Step 3: Test Deployment (5 minutes)

**Option A: Manual Trigger (Recommended for first test)**

1. Go to your repository's **Actions** tab
2. Click **"Deploy Monitoring Infrastructure"**
3. Click **"Run workflow"** dropdown
4. Select branch: `main`
5. Select environment: `dev`
6. Click **"Run workflow"** button
7. Watch it run!

**Option B: Push to Main**

```bash
# Make a small change
echo "" >> README.md
git add README.md
git commit -m "Test GitHub Actions OIDC deployment"
git push origin main
```

### Step 4: Verify Success (2 minutes)

**In GitHub:**
- ✅ Workflow shows green checkmark
- ✅ "Configure AWS credentials" step shows "Assuming role"
- ✅ "Deploy to dev" step completes successfully

**In AWS:**
```bash
# Check CloudFormation
aws cloudformation describe-stacks \
  --stack-name monitoring-dev \
  --profile YOUR_PROFILE \
  --query 'Stacks[0].StackStatus' \
  --output text
# Should show: UPDATE_COMPLETE or CREATE_COMPLETE

# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "dev-s3-" \
  --profile YOUR_PROFILE \
  --query 'MetricAlarms[*].AlarmName' \
  --output table
# Should list your alarms
```

---

## Manual Setup Steps

If you prefer to run commands manually instead of using the automated script, follow these steps.

### Step 1: Get Your AWS Account ID

```bash
aws sts get-caller-identity --profile YOUR_PROFILE --query Account --output text
```

Save this value - you'll need it multiple times.

### Step 2: Create OIDC Provider

This allows GitHub Actions to authenticate with AWS.

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --profile YOUR_PROFILE
```

**Note about thumbprint:** The thumbprint value `6938fd4d98bab03faadb97b34396831e3780aea1` is GitHub's current root CA certificate thumbprint. This is a stable value recommended by AWS for GitHub Actions OIDC integration.

**Note:** If you get an error that the provider already exists, that's fine - skip to Step 3.

### Step 3: Create Trust Policy File

Create a file named `github-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:*"
        }
      }
    }
  ]
}
```

**Important:** Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID from Step 1.

### Step 4: Create IAM Role

```bash
aws iam create-role \
  --role-name GitHubActionsCDKDeploy \
  --assume-role-policy-document file://github-trust-policy.json \
  --description "Role for GitHub Actions to deploy CDK monitoring stack" \
  --profile YOUR_PROFILE
```

### Step 5: Attach Permissions Policy

**Least Privilege Policy (Recommended):**

The script creates a custom policy with only the permissions needed for CDK deployment:

```bash
# The script automatically creates GitHubActionsCDKDeployPolicy
# This policy includes:
# - CloudFormation operations for CDK stacks
# - CloudWatch alarm management
# - SNS topic and subscription management
# - Lambda function management (for Slack/Teams)
# - IAM role management (for Lambda execution)
# - S3 operations for CDK assets
# - CDK bootstrap permissions
```

The policy is scoped to specific resource patterns (e.g., `monitoring-*` stacks, `*-monitoring-*` topics) to minimize security risk.

### Step 6: Verify CDK Bootstrap

```bash
aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --profile YOUR_PROFILE \
  --region us-east-1
```

If you get an error that the stack doesn't exist, bootstrap CDK:

```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1 --profile YOUR_PROFILE
```

### Step 7: Get Your Role ARN

```bash
aws iam get-role \
  --role-name GitHubActionsCDKDeploy \
  --profile YOUR_PROFILE \
  --query 'Role.Arn' \
  --output text
```

Save this ARN - you'll need it for GitHub Secrets.

Example: `arn:aws:iam::123456789012:role/GitHubActionsCDKDeploy`

---

## GitHub Configuration

### Step 1: Add GitHub Secret

1. Go to your GitHub repository: **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add this secret:

| Secret Name | Value |
|------------|-------|
| `AWS_ROLE_ARN_DEV` | `arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsCDKDeploy` |

**Important:** Use the actual role ARN from Step 7 above.

### Step 2: (Optional) Configure GitHub Environment

For additional security, set up a GitHub environment:

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name it `dev`
4. Add protection rules:
   - ✅ Required reviewers (optional)
   - ✅ Wait timer (optional)
   - ✅ Deployment branches: Only `main`

---

## Testing Your Setup

### Test 1: Manual Workflow Trigger

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Deploy Monitoring Infrastructure** workflow
4. Click **Run workflow** dropdown
5. Select branch: `main`
6. Select environment: `dev`
7. Click **Run workflow**

### Test 2: Monitor the Deployment

1. Click on the running workflow
2. Watch the logs
3. Look for these stages:
   - ✅ Build (~2 minutes)
   - ✅ Deploy-dev (~5 minutes)

**Expected Success Output:**
```
Configure AWS credentials
  Assuming role: arn:aws:iam::123456789012:role/GitHubActionsCDKDeploy
  ✓ Credentials configured

Deploy to dev
  ✓ CDK synth
  ✓ CDK deploy
  ✓ Stack monitoring-dev: UPDATE_COMPLETE
```

### Test 3: Verify in AWS

```bash
# Check CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name monitoring-dev \
  --profile YOUR_PROFILE \
  --query 'Stacks[0].[StackName,StackStatus,LastUpdatedTime]' \
  --output table

# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "dev-s3-" \
  --profile YOUR_PROFILE \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

---

## Troubleshooting

### Error: "User is not authorized to perform: sts:AssumeRoleWithWebIdentity"

**Cause:** Trust policy doesn't allow GitHub Actions to assume the role.

**Solution:** Verify the trust policy has the correct repository name:
```bash
aws iam get-role \
  --role-name GitHubActionsCDKDeploy \
  --profile YOUR_PROFILE \
  --query 'Role.AssumeRolePolicyDocument'
```

Should show: `"repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:*"`

### Error: "OpenIDConnect provider not found"

**Cause:** OIDC provider wasn't created.

**Solution:** Run Step 2 again to create the OIDC provider.

### Error: "Role does not exist"

**Cause:** IAM role wasn't created or has a different name.

**Solution:** 
```bash
# List all roles to find it
aws iam list-roles --profile YOUR_PROFILE --query 'Roles[?contains(RoleName, `GitHub`)].RoleName'

# Or create it again
aws iam create-role \
  --role-name GitHubActionsCDKDeploy \
  --assume-role-policy-document file://github-trust-policy.json \
  --profile YOUR_PROFILE
```

### Error: "Access Denied" during deployment

**Cause:** IAM role doesn't have sufficient permissions.

**Solution:** Verify policy is attached:
```bash
aws iam list-attached-role-policies \
  --role-name GitHubActionsCDKDeploy \
  --profile YOUR_PROFILE
```

Should show `AdministratorAccess` or your custom policy.

### Workflow doesn't trigger

**Cause:** Workflow file not committed or in wrong location.

**Solution:**
```bash
# Verify file exists
ls -la .github/workflows/deploy.yml

# Commit and push if needed
git add .github/workflows/deploy.yml
git commit -m "Update workflow for OIDC"
git push origin main
```

---

## Multiple Environments

To deploy to staging and prod environments, you need to set up OIDC authentication in each AWS account.

### Setup Steps:

1. **Run the setup script in each account:**
   ```bash
   # In staging account
   ./scripts/setup-oidc.sh
   # Enter staging AWS profile when prompted
   
   # In prod account
   ./scripts/setup-oidc.sh
   # Enter prod AWS profile when prompted
   ```

2. **Add GitHub secrets for each environment:**
   - `AWS_ROLE_ARN_DEV` (already configured)
   - `AWS_ROLE_ARN_STAGING` (add the role ARN from staging account)
   - `AWS_ROLE_ARN_PROD` (add the role ARN from prod account)

3. **Bootstrap CDK in each account:**
   ```bash
   cdk bootstrap aws://STAGING_ACCOUNT_ID/us-east-1 --profile staging
   cdk bootstrap aws://PROD_ACCOUNT_ID/us-east-1 --profile prod
   ```

### How It Works:

- Each AWS account has its own OIDC provider and IAM role
- All roles trust the same GitHub repository
- The workflow dynamically selects the correct role based on the environment being deployed
- This maintains security isolation between environments

---

## Security Best Practices

### 1. Least Privilege Permissions (Default)

The setup script now creates a custom policy with only necessary permissions. This policy:
- ✅ Scopes resources to specific patterns (e.g., `monitoring-*` stacks)
- ✅ Limits actions to only what's needed for CDK deployment
- ✅ Prevents access to unrelated AWS resources
- ✅ Follows AWS security best practices

**Note:** The policy includes permissions for all supported services (S3, ECS, RDS, ELB, EFS, FSx, SES, Step Functions, WAF) at the time this repo was initially created. If you add monitoring for additional AWS services not currently supported, you may need to update the policy by re-running the setup script or manually adding the required permissions.

### 2. Restrict to Specific Branches

Update trust policy to only allow deployments from `main`:

```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:ref:refs/heads/main"
}
```

### 3. Use GitHub Environments

Set up environments with required reviewers for production deployments.

### 4. Enable CloudTrail

Monitor all API calls made by the GitHub Actions role:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=GitHubActionsCDKDeploy \
  --profile YOUR_PROFILE
```

### 5. Regular Audits

Review role permissions quarterly and remove unused permissions.

---

## Alternative Authentication Methods

While OIDC is the recommended approach for its security benefits, there are two other methods available:

**IAM User with Access Keys:**
- Simpler setup but requires storing long-lived credentials in GitHub
- Must rotate keys every 90 days
- Security risk if credentials leak
- Good for quick testing only

**Self-Hosted Runner with Instance Profile:**
- No credentials in GitHub (uses EC2 instance profile)
- Requires managing EC2 infrastructure and runner software
- Additional AWS costs
- Best for organizations with existing EC2 infrastructure

**Recommendation:** Use OIDC (this guide) for production deployments. OIDC provides automatic credential rotation, no long-lived secrets, and follows AWS security best practices.

---

## Destroying Infrastructure via GitHub Actions

A separate workflow is available for safely destroying monitoring infrastructure through GitHub Actions.

### How to Destroy

1. Go to your repository's **Actions** tab
2. Click **"Destroy Monitoring Infrastructure"** workflow
3. Click **"Run workflow"** dropdown
4. Select the environment to destroy (dev, staging, or prod)
5. Type **"DESTROY"** (case-sensitive) in the confirmation field
6. Click **"Run workflow"**

### Safety Features

- **Manual trigger only** - No automatic destruction
- **Confirmation required** - Must type "DESTROY" exactly
- **Environment protection** - Uses GitHub environment rules (if configured)
- **Audit trail** - All actions logged in GitHub Actions history

### What Gets Deleted

- All CloudWatch alarms
- SNS topics and subscriptions
- Lambda functions (if Slack/Teams configured)
- CloudFormation stack

### What Remains

- CDK bootstrap resources (shared across stacks)
- CloudWatch Logs (expire based on retention settings)

### Workflow File

The destroy workflow is located at `.github/workflows/destroy.yml` and uses the same OIDC authentication as the deploy workflow.

---

**You're all set!** Your GitHub Actions workflow now uses secure OIDC authentication with no long-lived credentials. 🔒
