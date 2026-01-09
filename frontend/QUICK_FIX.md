# Quick Fix: VITE_API_URL Not Set Error

## Problem
You're seeing this error:
```
❌ VITE_API_URL is not set in production!
🔧 API Service initialized with base URL: https://backend-url-not-configured/api
```

This happens because **Vite embeds environment variables at build time**, not runtime. The Docker image was built without the `VITE_API_URL` build argument.

## Solution: Rebuild and Redeploy

### Option 1: Use the Deploy Script (Recommended)

The deploy script will automatically detect your backend URL and rebuild with the correct `VITE_API_URL`:

```bash
cd frontend
./deploy.sh
```

### Option 2: Manual Rebuild

1. **Get your backend URL:**
```bash
gcloud run services describe kiwi-backend \
  --region asia-south2 \
  --format="value(status.url)"
```

This will output something like: `https://kiwi-backend-299314838732.asia-south2.run.app`

2. **Build the Docker image with VITE_API_URL:**
```bash
cd frontend

BACKEND_URL="https://kiwi-backend-299314838732.asia-south2.run.app/api"

docker build --no-cache --platform linux/amd64 \
  --build-arg VITE_API_URL="${BACKEND_URL}" \
  -t asia-south2-docker.pkg.dev/299314838732/hr-management-repo/frontend:latest \
  .
```

**⚠️ IMPORTANT:** The URL must end with `/api`!

3. **Push the image:**
```bash
docker push asia-south2-docker.pkg.dev/299314838732/hr-management-repo/frontend:latest
```

4. **Deploy to Cloud Run:**
```bash
gcloud run deploy kiwi-frontend \
  --image asia-south2-docker.pkg.dev/299314838732/hr-management-repo/frontend:latest \
  --platform managed \
  --region asia-south2 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1
```

### Option 3: Using Cloud Build

```bash
cd frontend

# Get backend URL
BACKEND_URL=$(gcloud run services describe kiwi-backend \
  --region asia-south2 \
  --format="value(status.url)")/api

# Deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_API_URL="${BACKEND_URL}"
```

## Verification

After redeployment, check your browser console. You should see:
```
🔧 API Service initialized with base URL: https://kiwi-backend-299314838732.asia-south2.run.app/api
🔧 Environment: Production
🔧 VITE_API_URL env var: https://kiwi-backend-299314838732.asia-south2.run.app/api
```

## Why This Happens

Vite uses **build-time environment variable substitution**. This means:
- ✅ Environment variables starting with `VITE_` are embedded into the JavaScript bundle during `npm run build`
- ❌ Setting environment variables at runtime (in Cloud Run) won't work for Vite apps
- ✅ You must pass `--build-arg VITE_API_URL=...` when building the Docker image

## Common Mistakes

1. **Missing `/api` suffix:**
   - ❌ Wrong: `https://backend.run.app`
   - ✅ Correct: `https://backend.run.app/api`

2. **Using runtime env vars:**
   - ❌ Wrong: Setting `VITE_API_URL` in Cloud Run environment variables
   - ✅ Correct: Passing `--build-arg VITE_API_URL=...` during Docker build

3. **Not rebuilding:**
   - ❌ Wrong: Just redeploying the same image
   - ✅ Correct: Rebuilding the Docker image with the build arg

