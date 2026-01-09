# Switching from Vercel to Cloud Run

## Current Situation

You're currently accessing: `https://kiwi-shraddha.vercel.app` (Vercel)
You want to use: Cloud Run deployment

## Important: Why Cloud Run Env Vars Don't Work

**Setting environment variables in Cloud Run GUI will NOT work for Vite apps!**

Vite embeds environment variables at **build time** (when you run `npm run build`), not at runtime. This means:
- ❌ Setting `VITE_API_URL` in Cloud Run → Environment Variables won't work
- ✅ You must pass `--build-arg VITE_API_URL=...` when building the Docker image

## Step-by-Step: Deploy to Cloud Run

### Step 1: Get Your Backend URL

```bash
gcloud run services describe kiwi-backend \
  --region asia-south2 \
  --format="value(status.url)"
```

This will output: `https://kiwi-backend-299314838732.asia-south2.run.app`

### Step 2: Rebuild Docker Image with VITE_API_URL

**This is the critical step!** You must rebuild the image with the build argument:

```bash
cd frontend

BACKEND_URL="https://kiwi-backend-299314838732.asia-south2.run.app/api"

docker build --no-cache --platform linux/amd64 \
  --build-arg VITE_API_URL="${BACKEND_URL}" \
  -t asia-south2-docker.pkg.dev/299314838732/hr-management-repo/frontend:latest \
  .
```

### Step 3: Push the Image

```bash
docker push asia-south2-docker.pkg.dev/299314838732/hr-management-repo/frontend:latest
```

### Step 4: Deploy to Cloud Run

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

### Step 5: Get Your Cloud Run Frontend URL

```bash
gcloud run services describe kiwi-frontend \
  --region asia-south2 \
  --format="value(status.url)"
```

This will give you something like: `https://kiwi-frontend-xxxxx.asia-south2.run.app`

### Step 6: Access Your Cloud Run Deployment

**Use the Cloud Run URL, not the Vercel URL!**

Open: `https://kiwi-frontend-xxxxx.asia-south2.run.app` (your actual Cloud Run URL)

## Quick Deploy Script

Or simply use the deploy script:

```bash
cd frontend
./deploy.sh
```

This script automatically:
- Detects your backend URL
- Builds with `VITE_API_URL` set correctly
- Pushes and deploys to Cloud Run

## Verification

After deployment, check the browser console. You should see:

```
🔧 API Service initialized with base URL: https://kiwi-backend-299314838732.asia-south2.run.app/api
🔧 Environment: Production
🔧 VITE_API_URL env var: https://kiwi-backend-299314838732.asia-south2.run.app/api
```

## Common Mistakes

### ❌ Mistake 1: Setting Env Var in Cloud Run GUI
```
Setting VITE_API_URL in Cloud Run → Environment Variables
```
**Why it doesn't work:** Vite needs the variable at build time, not runtime.

### ❌ Mistake 2: Not Rebuilding the Image
```
Just redeploying the same Docker image without rebuilding
```
**Why it doesn't work:** The old image was built without VITE_API_URL.

### ❌ Mistake 3: Accessing Vercel Instead of Cloud Run
```
Still using https://kiwi-shraddha.vercel.app
```
**Why it doesn't work:** That's a different deployment!

## Option: Keep Using Vercel

If you prefer to keep using Vercel, you need to:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: **kiwi-shraddha**
3. Go to **Settings** → **Environment Variables**
4. Add: `VITE_API_URL` = `https://kiwi-backend-299314838732.asia-south2.run.app/api`
5. **Redeploy** (important!)

## Summary

- **Vercel**: Set env var in Vercel dashboard → Redeploy
- **Cloud Run**: Rebuild Docker image with `--build-arg VITE_API_URL=...` → Deploy

Both require a rebuild/redeploy after setting the variable!

