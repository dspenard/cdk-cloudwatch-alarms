# GitHub Actions OIDC Setup Guide

This guide walks you through setting up secure OIDC authentication for GitHub Actions to deploy your CDK monitoring stack.

## Why OIDC?

✅ **No long-lived credentials** - No access keys to manage or rotate  
✅ **Automatic credential rotation** - AWS handles it automatically  
✅ **More secure** - Credentials never leave AWS  
✅ **AWS best practice** - Recommended by AWS security team  

## Prerequisites

- AWS CLI configured with a profile
- Admin access to your AWS account (or permissions to create IAM roles/OIDC providers)
- Access to your GitHub repository settings

## Quick Start (15 minutes)

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
./scripts/setup-oidc.sh
```

The script will:
1. Get your AWS account ID
2. Create OIDC provider in AWS
3. Create IAM role with trust policy
4. Attach necessary permissions
5. Verify CDK bootstrap
6. Output the role ARN you need

### Option 2: Manual Setup

If you prefer to run commands manually, follow the steps below.

---

## Manual Setup Steps

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
          "token.actions.githubusercontent.com:sub": "repo:dspenard/cdk-cloudwatch-alarms:*"
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

**For Testing (Quick Start):**
```bash
aws iam attach-role-policy \
  --role-name GitHubActionsCDKDeploy \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
  --profile YOUR_PROFILE
```

**For Production (Recommended):**

Create a custom policy with least privilege permissions. See `docs/DEPLOYMENT_GUIDE.md` for the detailed policy, then:

```bash
# Create the policy first
aws iam create-policy \
  --policy-name CDKDeploymentPolicy \
  --policy-document file://cdk-deployment-policy.json \
  --profile YOUR_PROFILE

# Attach it to the role
aws iam attach-role-policy \
  --role-name GitHubActionsCDKDeploy \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/CDKDeploymentPolicy \
  --profile YOUR_PROFILE
```

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

1. Go to your GitHub repository: https://github.com/dspenard/cdk-cloudwatch-alarms
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add this secret:

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

Should show: `"repo:dspenard/cdk-cloudwatch-alarms:*"`

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

To set up staging and prod:

### For Each Environment:

1. **Create separate IAM role** (or use the same role with different permissions)
2. **Add GitHub secret** with the role ARN:
   - `AWS_ROLE_ARN_STAGING`
   - `AWS_ROLE_ARN_PROD`
3. **Bootstrap CDK** in each account:
   ```bash
   cdk bootstrap aws://STAGING_ACCOUNT_ID/us-east-1 --profile staging
   cdk bootstrap aws://PROD_ACCOUNT_ID/us-east-1 --profile prod
   ```

### Trust Policy for Multiple Accounts

If using separate AWS accounts, create the OIDC provider and role in each account with the same trust policy.

---

## Security Best Practices

### 1. Use Least Privilege Permissions

Replace `AdministratorAccess` with a custom policy that only grants necessary permissions.

### 2. Restrict to Specific Branches

Update trust policy to only allow deployments from `main`:

```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": "repo:dspenard/cdk-cloudwatch-alarms:ref:refs/heads/main"
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

## Verification Checklist

Before considering setup complete, verify:

- [ ] OIDC provider exists in AWS
- [ ] IAM role created with correct trust policy
- [ ] Permissions policy attached to role
- [ ] CDK bootstrapped in target account
- [ ] GitHub secret added with role ARN
- [ ] Workflow file updated for OIDC
- [ ] Test deployment successful
- [ ] CloudFormation stack deployed
- [ ] CloudWatch alarms created

---

## Next Steps

After OIDC is working:

1. ✅ Set up staging and prod environments
2. ✅ Configure branch protection rules
3. ✅ Add deployment notifications (Slack/Teams)
4. ✅ Implement least privilege IAM policies
5. ✅ Document the process for your team

---

## Quick Reference

### Role ARN Format
```
arn:aws:iam::ACCOUNT_ID:role/GitHubActionsCDKDeploy
```

### GitHub Secret Names
- Dev: `AWS_ROLE_ARN_DEV`
- Staging: `AWS_ROLE_ARN_STAGING`
- Prod: `AWS_ROLE_ARN_PROD`

### Useful Commands
```bash
# Get account ID
aws sts get-caller-identity --profile YOUR_PROFILE --query Account --output text

# Get role ARN
aws iam get-role --role-name GitHubActionsCDKDeploy --profile YOUR_PROFILE --query 'Role.Arn' --output text

# Test role assumption (from GitHub Actions)
aws sts assume-role-with-web-identity \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/GitHubActionsCDKDeploy \
  --role-session-name test \
  --web-identity-token TOKEN
```

---

**You're all set!** Your GitHub Actions workflow now uses secure OIDC authentication with no long-lived credentials. 🔒
