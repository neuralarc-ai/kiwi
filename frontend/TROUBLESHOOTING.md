# Troubleshooting Guide - Login "Route not found" Error

## Common Causes

### 1. VITE_API_URL Not Set Correctly

**Problem**: The frontend can't find the backend API because `VITE_API_URL` is not configured.

**Symptoms**:
- Error: "Route not found" or "API endpoint not found"
- Console shows: `API Service initialized with base URL: http://localhost:5001/api`
- But you're running in production/Docker

**Solution**:

#### For Local Development:
Create a `.env` file in the `frontend` directory:
```bash
VITE_API_URL=http://localhost:5001/api
```

#### For Docker/Production:
Build the image with the correct API URL:
```bash
docker build --platform linux/amd64 \
  --build-arg VITE_API_URL=https://your-backend-service.run.app/api \
  -t hr-management-frontend:latest .
```

**Important**: The URL must include `/api` at the end!

### 2. Incorrect API URL Format

**Problem**: The `VITE_API_URL` is missing the `/api` suffix.

**Wrong**:
```
VITE_API_URL=https://backend-service.run.app
```

**Correct**:
```
VITE_API_URL=https://backend-service.run.app/api
```

### 3. Backend Not Running or Not Accessible

**Problem**: The backend server is not running or not accessible from the frontend.

**Check**:
1. Verify backend is running: `curl http://localhost:5001/api/health`
2. Check backend logs for errors
3. Verify network connectivity between frontend and backend

**Solution**:
- Start the backend server
- Check firewall/security group settings
- Verify the backend URL is correct

### 4. CORS Issues

**Problem**: Browser is blocking the request due to CORS policy.

**Symptoms**:
- Console shows CORS error
- Network tab shows preflight request failing

**Solution**:
Ensure backend CORS is configured to allow your frontend origin:
```javascript
// In backend/server.js
app.use(cors({
  origin: ['https://your-frontend-service.run.app', 'http://localhost:5173'],
  credentials: true
}));
```

### 5. Wrong Port or Protocol

**Problem**: Using HTTP instead of HTTPS or wrong port.

**Check**:
- Cloud Run services use HTTPS by default
- Local development uses HTTP on port 5001

**Solution**:
- For Cloud Run: Use `https://` protocol
- For local: Use `http://localhost:5001/api`

## Debugging Steps

### Step 1: Check Console Logs

Open browser console and look for:
```
🔧 API Service initialized with base URL: [URL]
🌐 API Request: POST [FULL_URL]
```

This will show you exactly what URL is being called.

### Step 2: Check Network Tab

1. Open browser DevTools → Network tab
2. Try to login
3. Look for the failed request
4. Check:
   - Request URL (is it correct?)
   - Request Method (should be POST)
   - Response Status (404 = route not found, 500 = server error)
   - Response Body (error message)

### Step 3: Test Backend Directly

Test the backend API directly:
```bash
# Health check
curl http://localhost:5001/ health

# Login test (replace with actual credentials)
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Step 4: Verify Environment Variables

**For Local Development:**
```bash
# Check if .env file exists
ls -la frontend/.env

# Check contents
cat frontend/.env
```

**For Docker:**
```bash
# Check build args were passed
docker inspect hr-management-frontend:latest | grep VITE_API_URL
```

**For Cloud Run:**
```bash
# Check environment variables
gcloud run services describe hr-management-frontend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## Quick Fixes

### Fix 1: Create/Update .env File (Local)

```bash
cd frontend
echo "VITE_API_URL=http://localhost:5001/api" > .env
npm run dev
```

### Fix 2: Rebuild Docker Image with Correct URL

```bash
cd frontend

# Get your backend URL
BACKEND_URL=$(gcloud run services describe hr-management-backend \
  --region us-central1 \
  --format 'value(status.url)')

# Build with correct URL
docker build --platform linux/amd64 \
  --build-arg VITE_API_URL=${BACKEND_URL}/api \
  -t hr-management-frontend:latest .

# Push and redeploy
docker push hr-management-frontend:latest
gcloud run deploy hr-management-frontend \
  --image hr-management-frontend:latest \
  --region us-central1
```

### Fix 3: Verify Backend Route Exists

Check that the backend has the login route:
```bash
# Should show: POST /api/auth/login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

## Expected Behavior

### Successful Login Flow:

1. Frontend calls: `POST https://backend-service.run.app/api/auth/login`
2. Backend receives request at `/api/auth/login`
3. Backend processes and returns: `{ token: "...", user: {...} }`
4. Frontend stores token and redirects to dashboard

### Error Flow:

1. Frontend calls: `POST [WRONG_URL]/auth/login`
2. Backend returns: `404 - Route not found`
3. Frontend shows error: "Route not found"

## Still Having Issues?

1. **Check browser console** for detailed error messages
2. **Check backend logs** for incoming requests
3. **Verify both services are running** and accessible
4. **Test API directly** with curl/Postman
5. **Check network connectivity** between frontend and backend

## Contact & Support

If the issue persists:
1. Collect console logs
2. Collect network request/response details
3. Check backend server logs
4. Verify environment configuration



