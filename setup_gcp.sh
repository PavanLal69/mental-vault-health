#!/bin/bash
# ==============================================================================
# Google Cloud Setup Script for Gemma vLLM Codelab
# ==============================================================================
#
# INSTRUCTIONS:
# 1. Upload this file to your Google Cloud Shell.
# 2. Run: chmod +x setup_gcp.sh
# 3. Run: ./setup_gcp.sh <YOUR_PROJECT_ID>
#
# ==============================================================================

# Check if Project ID is provided
if [ -z "$1" ]; then
    echo "ERROR: Google Cloud Project ID is required."
    echo "Usage: ./setup_gcp.sh <your-project-id>"
    exit 1
fi

export GOOGLE_CLOUD_PROJECT="$1"
export MODEL_NAME="google/gemma-4-31B-it"
export SERVICE_NAME="gemma-rtx-vllm-codelab"
export GOOGLE_CLOUD_REGION="europe-west4"
export HF_TOKEN=""
export SERVICE_ACCOUNT="vllm-service-sa"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT}@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"
export MODEL_CACHE_BUCKET="${GOOGLE_CLOUD_PROJECT}-${GOOGLE_CLOUD_REGION}-hf-model-cache"
export GCS_MODEL_LOCATION="gs://${MODEL_CACHE_BUCKET}/model-cache/${MODEL_NAME}"
export VPC_NETWORK="vllm-${GOOGLE_CLOUD_REGION}-net"
export VPC_SUBNET="vllm-${GOOGLE_CLOUD_REGION}-subnet"
export SUBNET_RANGE="10.8.0.0/26"

echo "=================================================================="
echo "Configuring GCP Project variables..."
echo "Project ID:      ${GOOGLE_CLOUD_PROJECT}"
echo "Region:          ${GOOGLE_CLOUD_REGION}"
echo "Model Name:      ${MODEL_NAME}"
echo "Service Account: ${SERVICE_ACCOUNT_EMAIL}"
echo "=================================================================="

# Set active project and region config in gcloud
gcloud config set project "${GOOGLE_CLOUD_PROJECT}"
gcloud config set run/region "${GOOGLE_CLOUD_REGION}"

echo "Enabling required APIs (this may take a minute)..."
gcloud services enable --project "${GOOGLE_CLOUD_PROJECT}" \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    iam.googleapis.com \
    compute.googleapis.com \
    vpcaccess.googleapis.com \
    storage.googleapis.com

echo "=================================================================="
echo "APIs successfully enabled! Setup is complete."
echo "You can now source these variables in your active Cloud Shell:"
echo "------------------------------------------------------------------"
echo "export MODEL_NAME=\"${MODEL_NAME}\""
echo "export SERVICE_NAME=\"${SERVICE_NAME}\""
echo "export GOOGLE_CLOUD_PROJECT=\"${GOOGLE_CLOUD_PROJECT}\""
echo "export GOOGLE_CLOUD_REGION=\"${GOOGLE_CLOUD_REGION}\""
echo "export HF_TOKEN=\"${HF_TOKEN}\""
echo "export SERVICE_ACCOUNT=\"${SERVICE_ACCOUNT}\""
echo "export SERVICE_ACCOUNT_EMAIL=\"${SERVICE_ACCOUNT_EMAIL}\""
echo "export MODEL_CACHE_BUCKET=\"${MODEL_CACHE_BUCKET}\""
echo "export GCS_MODEL_LOCATION=\"${GCS_MODEL_LOCATION}\""
echo "export VPC_NETWORK=\"${VPC_NETWORK}\""
echo "export VPC_SUBNET=\"${VPC_SUBNET}\""
echo "export SUBNET_RANGE=\"${SUBNET_RANGE}\""
echo "=================================================================="
