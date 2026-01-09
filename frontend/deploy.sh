#!/bin/bash

# Deployment script for HR Management Frontend
# This script builds and deploys the frontend to Cloud Run

set -e

PROJECT_ID="299314838732"
REGION="asia-south2"
SERVICE_NAME="kiwi-frontend"
BACKEND_SERVICE_NAME="kiwi-backend"
REPO_NAME="hr-management-repo"
IMAGE_NAME="frontend"

echo "🚀 Starting deployment process..."
echo "📦 Project ID: $PROJECT_ID"
echo "🌍 Region: $REGION"
echo "🔧 Service: $SERVICE_NAME"

# Set project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Auto-detect backend URL - try multiple regions
echo "🔍 Detecting backend URL..."
BACKEND_BASE_URL=""

# Try asia-south1 first (based on error message)
BACKEND_BASE_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} --region asia-south1 --format="value(status.url)" 2>/dev/null || echo "")
if [ -n "$BACKEND_BASE_URL" ]; then
  echo "✅ Found backend in asia-south1: $BACKEND_BASE_URL"
else
  # Try asia-south2
  BACKEND_BASE_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} --region asia-south2 --format="value(status.url)" 2>/dev/null || echo "")
  if [ -n "$BACKEND_BASE_URL" ]; then
    echo "✅ Found backend in asia-south2: $BACKEND_BASE_URL"
  fi
fi

if [ -z "$BACKEND_BASE_URL" ]; then
  echo "⚠️  Warning: Could not auto-detect backend URL"
  echo "⚠️  Using hardcoded backend URL. Make sure it's correct!"
  # Based on error message, backend is in asia-south1
  BACKEND_BASE_URL="https://kiwi-backend-299314838732.asia-south1.run.app"
fi

# Ensure backend URL ends with /api
if [[ "$BACKEND_BASE_URL" != */api ]]; then
  BACKEND_URL="${BACKEND_BASE_URL}/api"
else
  BACKEND_URL="$BACKEND_BASE_URL"
fi

echo "🔗 Backend URL: $BACKEND_URL"

# Authenticate Docker
echo "🔐 Authenticating Docker with Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build timestamp for unique tag
BUILD_TAG=$(date +%s)
LATEST_TAG="latest"

# Build image with no cache
echo "🔨 Building Docker image with VITE_API_URL=${BACKEND_URL}..."
echo "⚠️  IMPORTANT: VITE_API_URL must be set at build time for Vite apps!"
docker build --no-cache --platform linux/amd64 \
  --build-arg VITE_API_URL="${BACKEND_URL}" \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${BUILD_TAG} \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${LATEST_TAG} \
  .

# Verify the build arg was used
echo "✅ Verifying build configuration..."
if docker inspect ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${LATEST_TAG} | grep -q "VITE_API_URL"; then
  echo "✅ VITE_API_URL found in image metadata"
else
  echo "⚠️  Warning: VITE_API_URL not found in image metadata"
fi

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

