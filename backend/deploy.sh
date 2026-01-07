#!/bin/bash

# Deployment script for HR Management Backend
# This script builds and deploys the backend to Cloud Run

set -e

PROJECT_ID="299314838732"
REGION="asia-south2"
SERVICE_NAME="kiwi-backend"
REPO_NAME="hr-management-repo"
IMAGE_NAME="backend"

echo "🚀 Starting deployment process..."
echo "📦 Project ID: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🔧 Service: $SERVICE_NAME"

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Authenticate Docker
echo "🔐 Authenticating Docker with Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build timestamp for unique tag
BUILD_TAG=$(date +%s)
LATEST_TAG="latest"

# Build image with no cache
echo "🔨 Building Docker image (no cache)..."
docker build --no-cache --platform linux/amd64 \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${BUILD_TAG} \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${LATEST_TAG} \
  .

echo "✅ Image built successfully"

# Push images
echo "📤 Pushing images to Artifact Registry..."
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${BUILD_TAG}
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${LATEST_TAG}

echo "✅ Images pushed successfully"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${LATEST_TAG} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production"

echo "✅ Deployment completed!"
echo "🌐 Service URL:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)"

echo ""
echo "🧪 Testing public endpoints..."
echo "Test public endpoint:"
curl -s https://kiwi-backend-299314838732.asia-south2.run.app/api/test-public | jq .

echo ""
echo "Version endpoint:"
curl -s https://kiwi-backend-299314838732.asia-south2.run.app/api/version | jq .

echo ""
echo "✅ Deployment and testing complete!"

