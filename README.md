# HR Management System

A complete HR Management System built with the MERN stack (MongoDB replaced with PostgreSQL).

## Tech Stack

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- Cloudinary (for image uploads)

### Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Axios
- React Hot Toast

## Features

1. **Authentication**
   - Admin and HR Executive login
   - JWT-based authentication
   - Role-based access control

2. **Employee Management**
   - Add, edit, delete employees
   - View employee list
   - Upload profile photos (Cloudinary)

3. **Attendance Module**
   - Mark attendance (Present/Absent/Late)
   - View daily attendance
   - View monthly attendance

4. **Leave Management**
   - Apply for leave
   - Approve/reject leave (Admin only)
   - View leave history

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Create PostgreSQL database:
```bash
createdb hr_management
```

5. Start the backend server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
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

The frontend will start on `http://localhost:3000`

## Creating Initial Admin User

After starting the backend, you can create an admin user using the API:

```bash
# First, you'll need to manually insert an admin user in the database
# Or use a tool like Postman to call the register endpoint
# Note: The register endpoint requires admin authentication, so you'll need to:
# 1. Manually insert a user in the database, or
# 2. Temporarily remove the auth middleware for the first user

# Example SQL to create first admin user (password: admin123)
# Password hash for 'admin123' using bcrypt
```

Alternatively, you can use the following Node.js script to create the first admin:

```javascript
// create-admin.js
import bcrypt from 'bcryptjs';
import { pool } from './config/database.js';

const createAdmin = async () => {
  const email = 'admin@hr.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  await pool.query(
    'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
    [email, hashedPassword, 'admin']
  );
  
  console.log('Admin user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
};

createAdmin();
```

## Default Credentials

After creating the admin user:
- **Email:** admin@hr.com
- **Password:** admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user (Admin only)

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee (Admin/HR Executive)
- `PUT /api/employees/:id` - Update employee (Admin/HR Executive)
- `DELETE /api/employees/:id` - Delete employee (Admin only)
- `POST /api/employees/:id/photo` - Upload profile photo

### Attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/daily/:date` - Get daily attendance
- `GET /api/attendance/monthly/:year/:month` - Get monthly attendance
- `GET /api/attendance/employee/:employeeId` - Get employee attendance

### Leaves
- `POST /api/leaves` - Apply for leave
- `GET /api/leaves` - Get all leaves
- `GET /api/leaves/:id` - Get single leave
- `PUT /api/leaves/:id/approve` - Approve leave (Admin only)
- `PUT /api/leaves/:id/reject` - Reject leave (Admin only)

## Project Structure

```
HR Management system/
├── backend/
│   ├── config/
│   │   ├── database.js
│   │   └── cloudinary.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── employee.controller.js
│   │   ├── attendance.controller.js
│   │   └── leave.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── employee.routes.js
│   │   ├── attendance.routes.js
│   │   └── leave.routes.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## Notes

- Make sure PostgreSQL is running before starting the backend
- The database tables will be created automatically on first run
- For production, update the JWT_SECRET and use environment variables
- Cloudinary is optional - you can modify the code to use local storage if needed


