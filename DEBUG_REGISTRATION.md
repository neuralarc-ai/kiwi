# Debug Registration Issues

## ✅ Added Enhanced Logging

I've added comprehensive logging to help debug registration issues:

### **Backend Logging:**
- ✅ Request received with email and role
- ✅ Current user count in database
- ✅ Password hashing status
- ✅ Database insertion attempt
- ✅ Success/failure with detailed error messages
- ✅ Database error codes and constraints

### **Frontend Logging:**
- ✅ API request details (method, URL, body)
- ✅ API response (status, data)
- ✅ Registration flow in AuthContext
- ✅ Auto-login process
- ✅ Error details

---

## 🔍 How to Debug

### **1. Check Backend Console:**
When you try to register, you should see:
```
📝 Register first user request received: { email: '...', role: '...', hasPassword: true }
📊 Current user count: 0
🔐 Hashing password...
💾 Inserting user into database: ... with role: ...
✅ User inserted successfully: { id: 1, email: '...', role: '...' }
✅ First user created successfully: ... (...)
```

### **2. Check Frontend Console (Browser):**
You should see:
```
🔐 Registering user: { email: '...', role: '...', hasToken: false }
🌐 API Request: { method: 'POST', url: '...', body: '...' }
📥 API Response: { status: 201, data: {...} }
✅ Registration response: {...}
🔑 Auto-login after registration
```

### **3. Check for Errors:**
If registration fails, you'll see:
- ❌ Error messages with details
- Database error codes
- Network errors
- Validation errors

---

## 🐛 Common Issues & Solutions

### **Issue 1: "Users already exist"**
**Solution:** Delete all users from database or use a fresh database

### **Issue 2: Database connection error**
**Solution:** Check `.env` file and ensure database is running

### **Issue 3: Invalid role error**
**Solution:** Make sure role is exactly `'admin'` or `'hr_executive'` (lowercase)

### **Issue 4: Email already exists**
**Solution:** Use a different email address

### **Issue 5: Network/CORS error**
**Solution:** 
- Check backend is running on correct port
- Check `VITE_API_URL` in frontend `.env`
- Check CORS settings in backend

---

## 🧪 Test Registration

1. **Open browser console** (F12)
2. **Open backend terminal** (to see server logs)
3. **Go to `/register`**
4. **Fill form:**
   - Email: `admin@test.com`
   - Password: `admin123`
   - Role: `admin`
5. **Submit**
6. **Check both consoles** for logs
7. **Check database** to verify user was created

---

## 📋 What to Check

1. ✅ Backend server is running
2. ✅ Database connection is working
3. ✅ `users` table exists
4. ✅ No users exist in database (for first registration)
5. ✅ Frontend `.env` has correct `VITE_API_URL`
6. ✅ Browser console shows API requests
7. ✅ Backend console shows registration attempts

---

**Status**: ✅ Enhanced logging added - Check console for detailed error messages!


