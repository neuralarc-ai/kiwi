# Docker Deployment Guide for GCP Cloud Run

This guide explains how to build and deploy the HR Management System backend to GCP Cloud Run using the optimized Docker image.

## Prerequisites

1. **Google Cloud SDK (gcloud)** installed and configured
2. **Docker** installed locally (for testing)
3. **GCP Project** with Cloud Run API enabled
4. **Container Registry** or **Artifact Registry** access

## Docker Image Optimization Features

The Dockerfile uses several optimization strategies:

- ✅ **Multi-stage builds** - Reduces final image size by separating build and runtime
- ✅ **Alpine Linux base** - Lightweight base image (~5MB vs ~150MB for regular Node)
- ✅ **Layer caching** - Package files copied first for better cache utilization
- ✅ **npm ci** - Faster, more reliable dependency installation
- ✅ **Production-only dependencies** - Excludes devDependencies from final image
- ✅ **Non-root user** - Enhanced security by running as non-root
- ✅ **dumb-init** - Proper signal handling for Cloud Run
- ✅ **Health checks** - Built-in health check endpoint

## Local Testing

### Build the Docker image

```bash
cd backend
docker build -t hr-management-backend:latest .
```

### Run the container locally

```bash
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_NAME=hr_management \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your-password \
  -e JWT_SECRET=your-jwt-secret \
  hr-management-backend:latest
```

### Test the health endpoint

```bash
curl http://localhost:8080/api/health
```

## Deploy to GCP Cloud Run

### Option 1: Using gcloud CLI (Recommended)

1. **Set your GCP project**

```bash
gcloud config set project YOUR_PROJECT_ID
```

2. **Build and push to Artifact Registry**

```bash
# Create Artifact Registry repository (first time only)
gcloud artifacts repositories create hr-management-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="HR Management System Backend"

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push the image
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/backend:latest .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/backend:latest
```

3. **Deploy to Cloud Run**

```bash
gcloud run deploy hr-management-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/hr-management-repo/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "DB_HOST=db-host:latest,DB_PORT=db-port:latest,DB_NAME=db-name:latest,DB_USER=db-user:latest,DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest"
```

### Option 2: Using Cloud Build (Automated)

1. **Create a `cloudbuild.yaml` file** (see below)

2. **Submit the build**

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Option 3: Build directly from source (Cloud Build)

```bash
gcloud run deploy hr-management-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

## Environment Variables

Set these environment variables in Cloud Run:

### Required:
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret for JWT token signing

### Optional:
- `PORT` - Server port (default: 8080, Cloud Run sets this automatically)
- `NODE_ENV` - Environment (default: production)
- `DB_SSL` - Enable SSL for database (true/false)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Using Secrets Manager (Recommended for Production)

1. **Create secrets in Secret Manager**

```bash
echo -n "your-db-password" | gcloud secrets create db-password --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
```

2. **Grant Cloud Run access to secrets**

```bash
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

3. **Reference secrets in Cloud Run**

```bash
gcloud run services update hr-management-backend \
  --update-secrets DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest
```

## Performance Optimization Tips

1. **Memory allocation**: Start with 512Mi, increase if needed
2. **CPU allocation**: 1 CPU is usually sufficient for most workloads
3. **Concurrency**: Cloud Run handles this automatically, but you can set `--concurrency` if needed
4. **Min instances**: Set to 1 to avoid cold starts (costs more)
5. **Max instances**: Set based on expected traffic
6. **Timeout**: Increase if you have long-running operations

## Monitoring

- View logs: `gcloud run services logs read hr-management-backend`
- Monitor metrics in Cloud Console
- Set up alerts for errors and latency

## Troubleshooting

1. **Container fails to start**: Check logs for database connection errors
2. **Health check fails**: Verify `/api/health` endpoint is accessible
3. **Out of memory**: Increase `--memory` flag
4. **Slow response**: Check database connection and query performance

## Image Size Optimization

The optimized Dockerfile produces an image of approximately **~150-200MB** (compared to ~500MB+ without optimization).

Key optimizations:
- Alpine Linux base: ~5MB vs ~150MB
- Multi-stage build: Excludes build tools from final image
- Production-only dependencies: Excludes devDependencies
- Layer caching: Faster subsequent builds



