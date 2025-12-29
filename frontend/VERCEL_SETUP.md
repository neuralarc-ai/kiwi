# Vercel Deployment Setup Guide

This guide explains how to configure your frontend deployed on Vercel (https://kiwi-shraddha.vercel.app) to connect to your backend API.

## Required Environment Variables

You **must** set the `VITE_API_URL` environment variable in Vercel to point to your backend API.

### Step 1: Get Your Backend URL

If your backend is deployed on Cloud Run:
```bash
gcloud run services describe hr-management-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

This will output something like: `https://hr-management-backend-xxxxx.run.app`

### Important: Add `/api` suffix

Your `VITE_API_URL` must end with `/api`:
```
https://hr-management-backend-xxxxx.run.app/api
```

### Step 2: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **kiwi-shraddha**
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:

   **Name**: `VITE_API_URL`
   
   **Value**: `https://your-backend-service.run.app/api`
   
   (Replace with your actual backend URL)
   
   **Environment**: Select all (Production, Preview, Development)

6. Click **Save**

### Step 3: Redeploy

After adding the environment variable:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeployment

## Verification

After redeployment, check the browser console on your Vercel site. You should see:

```
🔧 API Service initialized with base URL: https://your-backend-service.run.app/api
🔧 Environment: Production
🔧 VITE_API_URL env var: https://your-backend-service.run.app/api
🔧 Frontend URL: https://kiwi-shraddha.vercel.app
```

## Backend CORS Configuration

The backend is already configured to allow requests from:
- ✅ `https://kiwi-shraddha.vercel.app` (your Vercel frontend)
- ✅ `http://localhost:5173` (local development)
- ✅ `http://localhost:3000` (alternative local port)
- ✅ `http://localhost:8080` (Docker/local testing)

If you need to add more origins, update `backend/server.js`:

```javascript
const allowedOrigins = [
  'https://kiwi-shraddha.vercel.app',
  'https://your-custom-domain.com',
  // ... add more as needed
];
```

## Troubleshooting

### Error: "Route not found"

**Cause**: `VITE_API_URL` is not set or incorrect.

**Solution**:
1. Verify the environment variable is set in Vercel
2. Check that it ends with `/api`
3. Redeploy after setting the variable

### Error: CORS blocked

**Cause**: Backend CORS not configured for your frontend URL.

**Solution**: The backend already includes `https://kiwi-shraddha.vercel.app` in allowed origins. If you're using a custom domain, add it to the `allowedOrigins` array in `backend/server.js`.

### Error: "Cannot connect to backend"

**Cause**: Backend URL is incorrect or backend is not running.

**Solution**:
1. Test backend directly: `curl https://your-backend-service.run.app/api/health`
2. Verify the backend is deployed and running
3. Check backend logs for errors

## Example Configuration

### Vercel Environment Variables:

```
VITE_API_URL=https://hr-management-backend-abc123.run.app/api
```

### Backend CORS (already configured):

```javascript
allowedOrigins = [
  'https://kiwi-shraddha.vercel.app',
  'http://localhost:5173',
  // ...
]
```

## Quick Checklist

- [ ] Backend deployed and accessible
- [ ] Backend URL obtained (with `/api` suffix)
- [ ] `VITE_API_URL` set in Vercel environment variables
- [ ] Vercel project redeployed after setting env var
- [ ] Browser console shows correct API URL
- [ ] Login/API calls work from Vercel frontend

## Need Help?

1. Check browser console for detailed error messages
2. Check Vercel deployment logs
3. Test backend API directly with curl/Postman
4. Verify environment variables are set correctly in Vercel dashboard



