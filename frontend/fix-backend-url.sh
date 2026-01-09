#!/bin/bash

# Quick fix script to rebuild frontend with correct backend URL

set -e

PROJECT_ID="299314838732"
REGION="asia-south2"
BACKEND_REGION="asia-south1"  # Backend is in asia-south1
SERVICE_NAME="kiwi-frontend"
BACKEND_SERVICE_NAME="kiwi-backend"
REPO_NAME="hr-management-repo"
IMAGE_NAME="frontend"

echo "🔧 Fixing VITE_API_URL configuration..."
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Get backend URL
echo "🔍 Getting backend URL from asia-south1..."
BACKEND_BASE_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} --region ${BACKEND_REGION} --format="value(status.url)" 2>/dev/null || echo "")

if [ -z "$BACKEND_BASE_URL" ]; then
  echo "⚠️  Could not detect backend URL, using hardcoded value"
  BACKEND_BASE_URL="https://kiwi-backend-299314838732.asia-south1.run.app"
fi

# Ensure it ends with /api
if [[ "$BACKEND_BASE_URL" != */api ]]; then
  BACKEND_URL="${BACKEND_BASE_URL}/api"
else
  BACKEND_URL="$BACKEND_BASE_URL"
fi

echo "✅ Backend URL: $BACKEND_URL"
echo ""

# Authenticate Docker
echo "🔐 Authenticating Docker..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Build with correct VITE_API_URL
echo "🔨 Rebuilding Docker image with VITE_API_URL=${BACKEND_URL}..."
docker build --no-cache --platform linux/amd64 \
  --build-arg VITE_API_URL="${BACKEND_URL}" \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest \
  .

echo "✅ Image built successfully"
echo ""

# Push
echo "📤 Pushing image..."
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest

echo "✅ Image pushed successfully"
echo ""

# Deploy
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Frontend URL:"
FRONTEND_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(status.url)")
echo "$FRONTEND_URL"
echo ""
echo "🔗 Backend URL: $BACKEND_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Add frontend URL to backend CORS: $FRONTEND_URL"
echo "   2. Test login at: $FRONTEND_URL"
echo "   3. Check browser console for: 'API Service initialized with base URL: $BACKEND_URL'"

