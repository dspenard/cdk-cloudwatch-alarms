# GitHub Actions Setup Guide

**Deployment Status**: ⚠️ This automated deployment workflow has not been fully tested yet. Local deployment has been confirmed working. Use this guide as a reference for setting up CI/CD when ready.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Authentication Methods Overview](#authentication-methods-overview)
- [Step-by-Step Setup](#step-by-step-setup)
  - [Option A: OIDC with IAM Role](#option-a-oidc-with-iam-role-recommended-for-production)
  - [Option B: IAM User with Access Keys](#option-b-iam-user-with-access-keys-current-implementation)
  - [Option C: Self-Hosted Runner](#option-c-self-hosted-runner-with-instance-profile)
- [Testing Your Setup](#testing-your-setup)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

This guide shows how to transition from local deployment to automated GitHub Actions deployment.

## Overview

**Local Deployment** → **GitHub Actions Deployment**
- First deployment: Run locally to test (✅ Confirmed working)
- Subsequent deployments: Automated via GitHub Actions on PR merge (⚠️ Not yet tested)

## Prerequisites

- ✅ Successfully deployed locally to dev account
- ✅ GitHub repository created
- ✅ Code pushed to GitHub
- ✅ AWS authentication method chosen (see Step 1 below)

## Authentication Methods Overview

GitHub Actions needs to authenticate to AWS to deploy your CDK stack. There are three approaches:

| Method | Security | Complexity | Best For |
|--------|----------|------------|----------|
| **OIDC + IAM Role** | ⭐⭐⭐⭐⭐ Excellent | Medium | Production deployments |
| **IAM User + Keys** | ⭐⭐⭐ Good | Low | Getting started, testing |
| **Self-Hosted Runner** | ⭐⭐⭐⭐ Very Good | High | Existing runner infrastructure |

**Current workflow file uses**: IAM User + Keys (Option 2)

## Step-by-Step Setup

### Step 1: Choose Authentication Method

#### Option A: OIDC with IAM Role (Recommended for Production)

**Pros:**
- ✅ No long-lived credentials
- ✅ Automatic credential rotation
- ✅ Most secure
- ✅ AWS best practice

**Cons:**
- ⚠️ More complex initial setup
- ⚠️ Requires modifying workflow file

**Setup Steps:**

1. **Create OIDC Provider in AWS** (one-time per account):
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
     --profile YOUR_PROFILE
   ```

2. **Create IAM Role with Trust Policy**:
   
   Create file `github-actions-trust-policy.json`:
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
             "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:*"
           }
         }
       }
     ]
   }
   ```

   Create the role:
   ```bash
   aws iam create-role \
     --role-name GitHubActionsCDKDeploy \
     --assume-role-policy-document file://github-actions-trust-policy.json \
     --profile YOUR_PROFILE
   ```

3. **Attach Permissions Policy** (use least privilege policy from DEPLOYMENT_GUIDE.md):
   ```bash
   aws iam attach-role-policy \
     --role-name GitHubActionsCDKDeploy \
     --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
     --profile YOUR_PROFILE
   ```
   
   Or create and attach the custom least privilege policy.

4. **Update GitHub Actions Workflow**:
   
   Replace the credentials section in `.github/workflows/deploy.yml`:
   ```yaml
   - name: Configure AWS Credentials
     uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: arn:aws:iam::YOUR_ACCOUNT_ID:role/GitHubActionsCDKDeploy
       aws-region: us-east-1
   ```

5. **No GitHub Secrets Needed!** OIDC handles authentication automatically.

---

#### Option B: IAM User with Access Keys (Current Implementation)

**Pros:**
- ✅ Simple to set up
- ✅ Works immediately
- ✅ Good for testing

**Cons:**
- ⚠️ Long-lived credentials
- ⚠️ Must rotate keys regularly
- ⚠️ Credentials stored in GitHub

**Setup Steps:**

**Setup Steps:**

1. **Create IAM User**:
   - Click "Users" → "Create user"
   - Username: `github-actions-cdk-deploy`
   - Select "Programmatic access"

3. **Attach Policies**:
   - Click "Attach policies directly"
   - Add these policies:
     - `AdministratorAccess` (for simplicity) OR
     - Custom policy (see below for least privilege)

4. **Create Access Keys**:
   - After user is created, go to "Security credentials" tab
   - Click "Create access key"
   - Choose "Application running outside AWS"
   - Save the Access Key ID and Secret Access Key

2. **Attach Permissions Policy** (use least privilege policy from DEPLOYMENT_GUIDE.md)

3. **Add Credentials to GitHub Secrets** (see Step 2 below)

---

#### Option C: Self-Hosted Runner with Instance Profile

**Pros:**
- ✅ No credentials in GitHub
- ✅ Uses EC2 instance profile
- ✅ Familiar if you use build servers
- ✅ Full control over runner environment

**Cons:**
- ⚠️ Must manage runner infrastructure
- ⚠️ Must maintain runner software
- ⚠️ Additional AWS costs (EC2 instance)

**Setup Steps:**

1. **Launch EC2 Instance for Runner**:
   - Use Amazon Linux 2 or Ubuntu
   - Attach IAM instance profile with deployment permissions
   - Install GitHub Actions runner software

2. **Create IAM Role for Instance Profile**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cloudformation:*",
           "cloudwatch:*",
           "sns:*",
           "lambda:*",
           "iam:*",
           "s3:*",
           "logs:*",
           "ssm:GetParameter"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. **Install GitHub Actions Runner**:
   - Go to GitHub repo → Settings → Actions → Runners
   - Click "New self-hosted runner"
   - Follow instructions to install on your EC2 instance

4. **Update Workflow File**:
   ```yaml
   jobs:
     deploy:
       runs-on: self-hosted  # Use your runner instead of ubuntu-latest
   ```

5. **No GitHub Secrets Needed!** Instance profile handles authentication.

**Instance Profile vs IAM User:**
- Instance profile = credentials automatically rotated by AWS
- IAM user = static credentials you must manage
- Instance profile is more secure but requires infrastructure

---

### Step 2: Add AWS Credentials to GitHub Secrets (Only for Option B - IAM User)

**Skip this step if using Option A (OIDC) or Option C (Self-Hosted Runner)**

1. **Go to Your GitHub Repository**

2. **Navigate to Settings**:
   - Click "Settings" tab
   - Click "Secrets and variables" → "Actions"

3. **Add Secrets**:
   Click "New repository secret" for each:

   **For Dev Account:**
   - Name: `AWS_ACCESS_KEY_ID_DEV`
   - Value: Your AWS Access Key ID
   
   - Name: `AWS_SECRET_ACCESS_KEY_DEV`
   - Value: Your AWS Secret Access Key

   **For Staging Account (if you have one):**
   - Name: `AWS_ACCESS_KEY_ID_STAGING`
   - Value: Staging AWS Access Key ID
   
   - Name: `AWS_SECRET_ACCESS_KEY_STAGING`
   - Value: Staging AWS Secret Access Key

   **For Prod Account (if you have one):**
   - Name: `AWS_ACCESS_KEY_ID_PROD`
   - Value: Prod AWS Access Key ID
   
   - Name: `AWS_SECRET_ACCESS_KEY_PROD`
   - Value: Prod AWS Secret Access Key

### Step 3: Review the GitHub Actions Workflow (2 minutes)

The workflow file is already created at `.github/workflows/deploy.yml`. Let's review it:

```yaml
name: Deploy Monitoring Infrastructure

on:
  push:
    branches:
      - main          # Triggers on push to main
  pull_request:
    branches:
      - main          # Triggers on PR to main (for testing)
  workflow_dispatch:  # Allows manual trigger
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

  deploy-dev:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_DEV }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_DEV }}
          aws-region: us-east-1

      - name: Deploy to dev
        run: npm run deploy:dev -- --require-approval never
```

**What this does:**
- ✅ Triggers on push to `main` branch
- ✅ Builds and tests the code
- ✅ Automatically deploys to dev
- ✅ Can be manually triggered for other environments

### Step 4: Customize the Workflow (Optional, 5 minutes)

You may want to adjust the workflow based on your needs:

#### Option 1: Deploy Only to Dev (Simplest)

If you only have a dev account, the existing workflow is perfect. It will:
- Deploy to dev on every push to main
- Skip staging and prod

#### Option 2: Add Staging Auto-Deploy

If you want staging to deploy automatically after dev:

The workflow already includes this! Just add the staging secrets and it will work.

#### Option 3: Prod Requires Manual Approval

The workflow already requires manual trigger for prod:
- Go to Actions tab
- Click "Deploy Monitoring Infrastructure"
- Click "Run workflow"
- Select "prod" from dropdown

#### Option 4: Deploy on PR Merge Only

If you want to deploy only when PRs are merged (not on direct push):

Edit `.github/workflows/deploy.yml`:

```yaml
on:
  pull_request:
    types: [closed]
    branches:
      - main

jobs:
  deploy-dev:
    if: github.event.pull_request.merged == true
    # ... rest of job
```

### Step 5: Test the GitHub Actions Workflow (5 minutes)

#### Test 1: Verify Workflow File

```bash
# Make sure workflow file exists
ls -la .github/workflows/deploy.yml

# Commit and push if not already done
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow"
git push origin main
```

#### Test 2: Trigger a Deployment

**Method A: Push to Main**

```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "Test GitHub Actions deployment"
git push origin main
```

**Method B: Create a Pull Request**

```bash
# Create a feature branch
git checkout -b test-github-actions
echo "# Test" >> README.md
git add README.md
git commit -m "Test GitHub Actions"
git push origin test-github-actions

# Go to GitHub and create a PR
# Merge the PR
```

**Method C: Manual Trigger**

1. Go to your GitHub repository
2. Click "Actions" tab
3. Click "Deploy Monitoring Infrastructure" workflow
4. Click "Run workflow" button
5. Select branch and environment
6. Click "Run workflow"

#### Test 3: Monitor the Deployment

1. **Go to Actions Tab**: https://github.com/YOUR_USERNAME/YOUR_REPO/actions

2. **Click on the Running Workflow**

3. **Watch the Logs**:
   - Build job should complete first
   - Deploy-dev job should start
   - You'll see CDK deployment logs

4. **Check for Success**:
   - Green checkmark = success ✅
   - Red X = failure ❌

### Step 6: Verify Deployment in AWS (2 minutes)

After GitHub Actions completes:

1. **Check CloudFormation**:
   - Go to CloudFormation console
   - Look for `monitoring-dev` stack
   - Should show recent update time

2. **Check CloudWatch Alarms**:
   - Verify alarms still exist
   - Check for any new alarms if you added resources

### Step 7: Set Up Branch Protection (Optional, 3 minutes)

Protect your main branch to require PR reviews:

1. **Go to Repository Settings**
2. **Click "Branches"**
3. **Add Branch Protection Rule**:
   - Branch name pattern: `main`
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass (select "build")
   - ✅ Require branches to be up to date

Now all changes must go through PRs and pass tests before deploying.

## Workflow Behavior

### What Triggers Deployments

| Event | Dev | Staging | Prod |
|-------|-----|---------|------|
| Push to main | ✅ Auto | ✅ Auto | ❌ No |
| PR to main | ❌ No (just build) | ❌ No | ❌ No |
| Manual trigger | ✅ Yes | ✅ Yes | ✅ Yes |

### Deployment Flow

```
Developer → Push to main → GitHub Actions
                              ↓
                         Build & Test
                              ↓
                         Deploy to Dev
                              ↓
                    Deploy to Staging (if configured)
                              ↓
                    Prod (manual trigger only)
```

## Common Workflows

### Workflow 1: Daily Development

```bash
# 1. Create feature branch
git checkout -b add-new-s3-bucket

# 2. Make changes
# Edit lib/stacks/monitoring-stack.ts

# 3. Test locally first (optional but recommended)
npm run build
cdk diff --context environment=dev --profile dev

# 4. Commit and push
git add .
git commit -m "Add monitoring for new S3 bucket"
git push origin add-new-s3-bucket

# 5. Create PR on GitHub
# 6. Review and merge PR
# 7. GitHub Actions automatically deploys to dev
```

### Workflow 2: Emergency Fix

```bash
# 1. Make fix
git checkout -b hotfix-alarm-threshold

# 2. Edit files
# 3. Test locally
npm run build
cdk deploy --context environment=dev --profile dev

# 4. If working, push and merge PR
git add .
git commit -m "Fix alarm threshold"
git push origin hotfix-alarm-threshold

# 5. Merge PR → Auto-deploys to dev
```

### Workflow 3: Deploy to Production

```bash
# 1. Ensure dev and staging are working
# 2. Go to GitHub Actions tab
# 3. Click "Deploy Monitoring Infrastructure"
# 4. Click "Run workflow"
# 5. Select "prod" environment
# 6. Click "Run workflow"
# 7. Monitor deployment
```

## Troubleshooting

### "Error: Credentials could not be loaded"

**Problem**: GitHub Actions can't access AWS credentials

**Solution**:
1. Verify secrets are added to GitHub (Settings → Secrets)
2. Check secret names match exactly: `AWS_ACCESS_KEY_ID_DEV`
3. Verify IAM user has correct permissions

### "Error: Need to perform AWS calls for account"

**Problem**: CDK not bootstrapped in the account

**Solution**:
```bash
# Bootstrap from your local machine
cdk bootstrap aws://ACCOUNT-ID/us-east-1 --profile dev
```

### "Error: Stack is in UPDATE_ROLLBACK_COMPLETE state"

**Problem**: Previous deployment failed

**Solution**:
1. Go to CloudFormation console
2. Delete the failed stack
3. Re-run GitHub Actions workflow

### Workflow doesn't trigger

**Problem**: Workflow file not in correct location

**Solution**:
```bash
# Verify file location
ls -la .github/workflows/deploy.yml

# Should be exactly: .github/workflows/deploy.yml
```

### Build succeeds but deploy fails

**Problem**: Usually AWS permissions or CDK issues

**Solution**:
1. Check GitHub Actions logs for specific error
2. Try deploying locally to see detailed error
3. Verify IAM permissions
4. Check CloudFormation events in AWS console

## Security Best Practices

### 1. Use IAM Roles Instead of Access Keys (Advanced)

For better security, use OIDC with GitHub:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT-ID:role/GitHubActionsRole
    aws-region: us-east-1
```

See: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

### 2. Rotate Access Keys Regularly

- Rotate IAM user access keys every 90 days
- Update GitHub secrets when rotated

### 3. Use Environment Secrets

For production, use environment-specific secrets:
1. Go to Settings → Environments
2. Create "prod" environment
3. Add required reviewers
4. Add secrets specific to prod

### 4. Limit IAM Permissions

Use least privilege IAM policies instead of AdministratorAccess.

## Monitoring GitHub Actions

### View Deployment History

1. Go to Actions tab
2. See all workflow runs
3. Click any run to see logs
4. Download logs for debugging

### Set Up Notifications

1. Go to Settings → Notifications
2. Enable "Actions" notifications
3. Get notified on workflow failures

### Add Status Badge to README

Add to your README.md:

```markdown
![Deploy Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)
```

## Next Steps

After GitHub Actions is working:

1. ✅ Set up branch protection
2. ✅ Configure staging environment (if needed)
3. ✅ Set up prod deployment with approvals
4. ✅ Add Slack/Teams notifications for deployments
5. ✅ Document deployment process for team
6. ✅ Set up monitoring for GitHub Actions itself

## Quick Reference

### Local Deployment
```bash
npm run deploy:dev
```

### GitHub Actions Deployment
```bash
# Push to main
git push origin main

# Or create and merge PR
git checkout -b feature
# make changes
git push origin feature
# merge PR on GitHub
```

### Manual Trigger
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose environment

### View Logs
1. Actions tab
2. Click workflow run
3. Click job name
4. Expand steps

---

**You're all set!** Your CDK monitoring infrastructure will now deploy automatically via GitHub Actions. 🚀
