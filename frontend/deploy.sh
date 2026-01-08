#!/bin/bash

# Deployment script for HR Management Frontend
# This script builds and deploys the frontend to Cloud Run

set -e

PROJECT_ID="299314838732"
REGION="asia-south2"
SERVICE_NAME="kiwi-frontend"
REPO_NAME="hr-management-repo"
IMAGE_NAME="frontend"
# Set your backend API URL here
BACKEND_URL="https://kiwi-backend-299314838732.asia-south2.run.app/api"

echo "🚀 Starting deployment process..."
echo "📦 Project ID: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🔧 Service: $SERVICE_NAME"
echo "🔗 Backend URL: $BACKEND_URL"

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
  --build-arg VITE_API_URL=${BACKEND_URL} \
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
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300

echo "✅ Deployment completed!"
echo "🌐 Service URL:"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)")
echo $SERVICE_URL

echo ""
echo "🧪 Testing deployment..."
echo "Health check:"
curl -s ${SERVICE_URL}/health || echo "Health check failed"

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend URL: $SERVICE_URL"

