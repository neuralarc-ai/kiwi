# Fix Google Maps API Key Referrer Restriction Error

## Error Message
```
RefererNotAllowedMapError
Your site URL to be authorized: http://localhost:5173/dashboard/employees
```

## What This Means
Your Google Maps API key has HTTP referrer restrictions that don't include your localhost development URL. This is a security feature to prevent unauthorized use of your API key.

## How to Fix

### Option 1: Add Localhost to API Key Restrictions (Recommended for Development)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Navigate to APIs & Services > Credentials**
   - Click on "APIs & Services" in the left sidebar
   - Click on "Credentials"

3. **Find Your API Key**
   - Look for the API key: `AIzaSyB7ZYnoirMCaXKigVgF7m7HBSoj7aDiyzk`
   - Click on it to edit

4. **Update Application Restrictions**
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Click "Add an item"
   - Add these referrers:
     ```
     http://localhost:5173/*
     http://localhost:3000/*
     http://localhost:8080/*
     https://kiwi-frontend-299314838732.asia-south2.run.app/*
     https://kiwi.he2.ai/*
     ```
   - Click "Save"

5. **Wait for Changes to Propagate**
   - Changes can take a few minutes to take effect
   - Refresh your browser and try again

### Option 2: Remove Restrictions (NOT Recommended for Production)

⚠️ **Warning**: Only use this for development/testing. Never use an unrestricted API key in production.

1. **Go to Google Cloud Console > APIs & Services > Credentials**
2. **Click on your API key**
3. **Under "Application restrictions", select "None"**
4. **Click "Save"**

### Option 3: Create a Separate Development API Key

1. **Create a new API key** in Google Cloud Console
2. **Set restrictions to allow localhost** (as in Option 1)
3. **Update the key in your code**:
   ```typescript
   const GOOGLE_MAPS_API_KEY = 'YOUR_NEW_DEV_KEY'
   ```
4. **Keep your production key restricted** to your production domains

## Verify the Fix

1. **Clear your browser cache** or use an incognito window
2. **Open the Add Employee modal**
3. **Check the browser console** - you should see:
   ```
   ✅ Google Maps script loaded
   ✅ Google Maps Autocomplete initialized successfully
   ```
4. **Type in the address field** - you should see autocomplete suggestions

## Additional Notes

- **API Key Restrictions**: Always use HTTP referrer restrictions in production
- **Billing**: Make sure your Google Cloud project has billing enabled (Google Maps requires billing)
- **API Enablement**: Ensure "Maps JavaScript API" and "Places API" are enabled in your project
- **Quotas**: Check your API quotas if you're making many requests

## Troubleshooting

If you still see errors after updating restrictions:

1. **Wait 5-10 minutes** for changes to propagate
2. **Clear browser cache** completely
3. **Check API key status** in Google Cloud Console
4. **Verify APIs are enabled**:
   - Maps JavaScript API
   - Places API
5. **Check browser console** for specific error messages

