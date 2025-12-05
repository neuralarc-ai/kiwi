# Quick Setup Guide

## Step 1: Database Setup

1. Install PostgreSQL if not already installed
2. Create a new database:
```bash
createdb hr_management
```

## Step 2: Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `env.example`):
```bash
cp env.example .env
```

4. Update `.env` with your database credentials and other settings

5. Start the backend server:
```bash
npm run dev
```

6. In a new terminal, create the admin user:
```bash
cd backend
npm run create-admin
```

This will create an admin user with:
- Email: `admin@hr.com`
- Password: `admin123`

## Step 3: Frontend Setup

1. Navigate to frontend directory (in a new terminal):
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Step 4: Access the Application

1. Open your browser and go to: `http://localhost:3000`
2. Login with the admin credentials created in Step 2
3. Start using the HR Management System!

## Important Notes

- Make sure PostgreSQL is running before starting the backend
- The database tables will be created automatically on first backend startup
- For Cloudinary image uploads, you'll need to sign up at cloudinary.com and add your credentials to `.env`
- If you don't want to use Cloudinary, you can modify the code to use local file storage

## Troubleshooting

### Database Connection Error
- Check that PostgreSQL is running
- Verify database credentials in `.env`
- Ensure the database `hr_management` exists

### Port Already in Use
- Backend default port: 5000
- Frontend default port: 3000
- Change ports in `.env` (backend) or `vite.config.js` (frontend) if needed

### Module Not Found Errors
- Run `npm install` in both backend and frontend directories
- Make sure you're using Node.js v16 or higher


