#!/bin/bash
# GitHub Actions OIDC Setup Script for AWS
# This script sets up OIDC authentication for GitHub Actions to deploy CDK stacks

# IMPORTANT: If you forked this repository, update the GITHUB_ORG and GITHUB_REPO variables below
# to match YOUR repository (not the original template)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}GitHub Actions OIDC Setup for AWS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get AWS Account ID
echo -e "${YELLOW}Step 1: Getting AWS Account ID...${NC}"
read -p "Enter your AWS profile name (e.g., dev, default): " AWS_PROFILE
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)
echo -e "${GREEN}✓ Account ID: $ACCOUNT_ID${NC}"
echo ""

# GitHub repository info
GITHUB_ORG="dspenard"
GITHUB_REPO="cdk-cloudwatch-alarms"

echo -e "${YELLOW}⚠️  IMPORTANT: If you forked this repo, update GITHUB_ORG and GITHUB_REPO above!${NC}"
echo -e "${GREEN}✓ GitHub Repo: $GITHUB_ORG/$GITHUB_REPO${NC}"
echo ""
read -p "Is this YOUR repository? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please edit this script and update GITHUB_ORG and GITHUB_REPO variables${NC}"
    exit 1
fi
echo ""

# Step 2: Create OIDC Provider
echo -e "${YELLOW}Step 2: Creating OIDC Provider...${NC}"
echo "This allows GitHub Actions to authenticate with AWS"

# Check if OIDC provider already exists
if aws iam get-open-id-connect-provider \
    --open-id-connect-provider-arn "arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" \
    --profile "$AWS_PROFILE" &>/dev/null; then
    echo -e "${GREEN}✓ OIDC Provider already exists${NC}"
else
    # Note: thumbprint-list is GitHub's current root CA certificate thumbprint
    # This value is stable and recommended by AWS for GitHub Actions OIDC
    aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --client-id-list sts.amazonaws.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
        --profile "$AWS_PROFILE"
    echo -e "${GREEN}✓ OIDC Provider created${NC}"
fi
echo ""

# Step 3: Create Trust Policy
echo -e "${YELLOW}Step 3: Creating IAM Role Trust Policy...${NC}"
cat > /tmp/github-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:*"
        }
      }
    }
  ]
}
EOF
echo -e "${GREEN}✓ Trust policy created${NC}"
echo ""

# Step 4: Create IAM Role
echo -e "${YELLOW}Step 4: Creating IAM Role...${NC}"
ROLE_NAME="GitHubActionsCDKDeploy"

# Check if role already exists
if aws iam get-role --role-name "$ROLE_NAME" --profile "$AWS_PROFILE" &>/dev/null; then
    echo -e "${YELLOW}! Role already exists, updating trust policy...${NC}"
    aws iam update-assume-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-document file:///tmp/github-trust-policy.json \
        --profile "$AWS_PROFILE"
    echo -e "${GREEN}✓ Trust policy updated${NC}"
else
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/github-trust-policy.json \
        --description "Role for GitHub Actions to deploy CDK monitoring stack" \
        --profile "$AWS_PROFILE"
    echo -e "${GREEN}✓ IAM Role created${NC}"
fi
echo ""

# Step 5: Attach Permissions Policy
echo -e "${YELLOW}Step 5: Attaching permissions policy...${NC}"
echo "Using AdministratorAccess for simplicity (consider least privilege for production)"

aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
    --profile "$AWS_PROFILE" 2>/dev/null || echo "Policy already attached"

echo -e "${GREEN}✓ Permissions attached${NC}"
echo ""

# Step 6: Verify CDK Bootstrap
echo -e "${YELLOW}Step 6: Verifying CDK Bootstrap...${NC}"
if aws cloudformation describe-stacks \
    --stack-name CDKToolkit \
    --profile "$AWS_PROFILE" \
    --region us-east-1 &>/dev/null; then
    echo -e "${GREEN}✓ CDK already bootstrapped${NC}"
else
    echo -e "${RED}✗ CDK not bootstrapped${NC}"
    echo "Run: cdk bootstrap aws://$ACCOUNT_ID/us-east-1 --profile $AWS_PROFILE"
fi
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update your GitHub Actions workflow file with:"
echo -e "   ${GREEN}role-to-assume: arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}${NC}"
echo ""
echo "2. No GitHub Secrets needed! OIDC handles authentication automatically."
echo ""
echo "3. Push your changes and test the workflow"
echo ""
echo -e "${YELLOW}Role ARN for workflow:${NC}"
echo -e "${GREEN}arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}${NC}"
echo ""

# Save role ARN to file for easy reference
echo "arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}" > .github-role-arn.txt
echo -e "${GREEN}✓ Role ARN saved to .github-role-arn.txt${NC}"
