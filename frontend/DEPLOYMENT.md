# Frontend Docker Deployment Guide for GCP Cloud Run

This guide explains how to build and deploy the HR Management System frontend to GCP Cloud Run using the optimized Docker image.

## Prerequisites

1. **Google Cloud SDK (gcloud)** installed and configured
2. **Docker** installed locally (for testing)
3. **GCP Project** with Cloud Run API enabled
4. **Container Registry** or **Artifact Registry** access

## Docker Image Optimization Features

The Dockerfile uses several optimization strategies:

- ✅ **Multi-stage builds** - Separates build and runtime stages
- ✅ **Alpine Linux base** - Lightweight nginx (~5MB base)
- ✅ **Layer caching** - Package files copied first
- ✅ **nginx** - High-performance web server for static files
- ✅ **SPA routing support** - All routes serve index.html
- ✅ **Gzip compression** - Reduced bandwidth usage
- ✅ **Caching headers** - Optimized asset caching
- ✅ **Security headers** - XSS protection, frame options, etc.
- ✅ **Health checks** - Built-in health check endpoint

## Important: VITE_API_URL Configuration

**Vite embeds environment variables at build time**, so `VITE_API_URL` must be set during the Docker build process. You have two options:

### Option 1: Build with API URL (Recommended)

Build the image with the backend API URL:

```bash
docker build --platform linux/amd64 \
  --build-arg VITE_API_URL=https://your-backend-url.run.app/api \
  -t hr-management-frontend:latest .
```

### Option 2: Build with Placeholder (Runtime Replacement)

If you need to change the API URL without rebuilding, you can use a placeholder and replace it at container startup (requires a custom entrypoint script).

## Local Testing

### Build the Docker image

```bash
cd frontend

# Build with your backend API URL
docker build --platform linux/amd64 \
  --build-arg VITE_API_URL=http://localhost:5001/api \
  -t hr-management-frontend:latest .
```

### Run the container locally

```bash
docker run -p 8080:8080 hr-management-frontend:latest
```

### Test the application

```bash
# Health check
curl http://localhost:8080/health

# Open in browser
open http://localhost:8080
```

## Deploy to GCP Cloud Run

### Option 1: Using gcloud CLI (Recommended)

1. **Set your GCP project**

```bash
gcloud config set project YOUR_PROJECT_ID
```

2. **Build and push to Artifact Registry**

```bash
# Create Artifact Registry repository (if not exists)
gcloud artifacts repositories create hr-management-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="HR Management System"

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build with backend API URL and push
docker build --platform linux/amd64 \
  --build-arg VITE_API_URL=https://your-backend-service.run.app/api \
  -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/frontend:latest \
  .

docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/frontend:latest
```

3. **Deploy to Cloud Run**

```bash
gcloud run deploy hr-management-frontend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300
```

### Option 2: Using Cloud Build (Automated)

Create a `cloudbuild.yaml` file:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--platform'
      - 'linux/amd64'
      - '--build-arg'
      - 'VITE_API_URL=https://your-backend-service.run.app/api'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/hr-management-repo/frontend:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/hr-management-repo/frontend:latest'
      - '.'
    dir: 'frontend'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/hr-management-repo/frontend'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'hr-management-frontend'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/hr-management-repo/frontend:$SHORT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '8080'
      - '--memory'
      - '256Mi'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/hr-management-repo/frontend:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/hr-management-repo/frontend:latest'
```

Then submit:

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Option 3: Build directly from source (Cloud Build)

```bash
gcloud run deploy hr-management-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --build-env-vars VITE_API_URL=https://your-backend-service.run.app/api
```

## Connecting Frontend to Backend

After deploying both services:

1. **Get your backend Cloud Run URL**:
   ```bash
   gcloud run services describe hr-management-backend \
     --region us-central1 \
     --format 'value(status.url)'
   ```

2. **Rebuild frontend with backend URL**:
   ```bash
   docker build --platform linux/amd64 \
     --build-arg VITE_API_URL=$(gcloud run services describe hr-management-backend --region us-central1 --format 'value(status.url)')/api \
     -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/frontend:latest \
     .
   ```

3. **Redeploy frontend**:
   ```bash
   docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/frontend:latest
   gcloud run deploy hr-management-frontend \
     --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/frontend:latest \
     --region us-central1
   ```

## CORS Configuration

Ensure your backend has CORS configured to allow requests from your frontend domain:

```javascript
// In backend server.js
app.use(cors({
  origin: ['https://your-frontend-service.run.app', 'http://localhost:5173'],
  credentials: true
}));
```

## Performance Optimization Tips

1. **Memory allocation**: 256Mi is usually sufficient for a static site
2. **CPU allocation**: 1 CPU is sufficient
3. **Min instances**: Set to 0 to save costs (cold starts are fast for static sites)
4. **Max instances**: Set based on expected traffic
5. **CDN**: Consider using Cloud CDN in front of Cloud Run for better global performance

## Nginx Configuration Features

The included `nginx.conf` provides:

- ✅ **SPA routing** - All routes serve index.html for React Router
- ✅ **Gzip compression** - Reduces bandwidth by ~70%
- ✅ **Asset caching** - Static assets cached for 1 year
- ✅ **Security headers** - XSS protection, frame options
- ✅ **Health check endpoint** - `/health` for monitoring

## Monitoring

- View logs: `gcloud run services logs read hr-management-frontend`
- Monitor metrics in Cloud Console
- Set up alerts for errors and latency

## Troubleshooting

1. **404 errors on routes**: Ensure nginx.conf is properly copied and SPA routing is configured
2. **API calls failing**: Verify VITE_API_URL is set correctly at build time
3. **CORS errors**: Check backend CORS configuration
4. **Slow loading**: Enable Cloud CDN or increase memory allocation

## Image Size Optimization

The optimized Dockerfile produces an image of approximately **~50-80MB** (compared to ~300MB+ without optimization).

Key optimizations:
- Alpine Linux base: ~5MB vs ~150MB
- Multi-stage build: Excludes Node.js and build tools from final image
- nginx Alpine: Lightweight web server
- Only production build artifacts included



