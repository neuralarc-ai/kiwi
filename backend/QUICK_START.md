# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (or Supabase)
- npm or yarn

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

```bash
cp env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_management
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

### Step 3: Start Backend Server

```bash
npm run dev
```

The server will:
- ✅ Connect to database
- ✅ Create all tables automatically
- ✅ Start on port 5001 (or PORT from .env)

### Step 4: Create Admin User

In a new terminal:
```bash
cd backend
npm run create-admin
```

This creates:
- **Email:** admin@hr.com
- **Password:** admin123

### Step 5: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`

### Step 6: Login

1. Open `http://localhost:5173`
2. Click "Login"
3. Use credentials:
   - Email: `admin@hr.com`
   - Password: `admin123`

## ✅ You're Ready!

Start using the HR Management System:
- Add employees
- Track attendance
- Manage leaves
- Process payroll
- And more!

## 📚 Next Steps

- See `BACKEND_IMPLEMENTATION.md` for API documentation
- See `API_DOCUMENTATION.md` for detailed endpoints
- See `SUPABASE_QUICK_START.md` if using Supabase

## 🆘 Need Help?

- Check `README.md` for detailed setup
- See `SUPABASE_CONNECTION_GUIDE.md` for database issues
- Review error messages in terminal
