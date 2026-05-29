#!/bin/bash
# ==============================================================================
# Google Cloud Run Deployment Script for Memory Vault Backend
# ==============================================================================

# Default Configuration
DEFAULT_PROJECT_ID="mental-vault-73bca"
DEFAULT_BILLING_ACCOUNT="01D615-8BA644-02AC9C"
DEFAULT_REGION="europe-west4"
DEFAULT_MODEL="google/gemma-2-27b-it"

echo "=================================================================="
echo "Memory Vault GCP Cloud Run Deployment Helper"
echo "=================================================================="

# Prompt for Project ID
read -p "Enter your GCP Project ID [${DEFAULT_PROJECT_ID}]: " PROJECT_ID
PROJECT_ID=${PROJECT_ID:-$DEFAULT_PROJECT_ID}

# Prompt for Billing Account
read -p "Enter Billing Account ID [${DEFAULT_BILLING_ACCOUNT}]: " BILLING_ACCOUNT
BILLING_ACCOUNT=${BILLING_ACCOUNT:-$DEFAULT_BILLING_ACCOUNT}

# Prompt for Region
read -p "Enter Deployment Region [${DEFAULT_REGION}]: " REGION
REGION=${REGION:-$DEFAULT_REGION}

# Prompt for Together API Key
read -p "Enter TOGETHER_API_KEY (looks like vck_...): " TOGETHER_KEY

echo "------------------------------------------------------------------"
echo "Configuration Summary:"
echo "Project ID:      $PROJECT_ID"
echo "Billing Account: $BILLING_ACCOUNT"
echo "Region:          $REGION"
echo "AI Model:        $DEFAULT_MODEL"
echo "=================================================================="

# Set active project
echo "Configuring active project..."
gcloud config set project "$PROJECT_ID"

# Link billing account
echo "Linking billing account..."
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

# Enable services
echo "Enabling GCP APIs (this may take a few minutes)..."
gcloud services enable --project "$PROJECT_ID" \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    iam.googleapis.com \
    compute.googleapis.com \
    vpcaccess.googleapis.com \
    storage.googleapis.com

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy memory-vault-backend \
    --source . \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=sqlite:///app/memory_vault.db,PORT=8080,TOGETHER_API_KEY=$TOGETHER_KEY,OLLAMA_MODEL=$DEFAULT_MODEL"

echo "=================================================================="
echo "Deployment Complete!"
echo "Please set VITE_API_URL in Vercel to your Cloud Run URL."
echo "=================================================================="
