# Backend Files Summary

This document provides a complete overview of all backend files in the HR Management System.

## 📁 Directory Structure

```
backend/
├── config/              # Configuration files
├── controllers/         # Business logic controllers
├── middleware/          # Express middleware
├── routes/              # API route definitions
├── scripts/             # Utility scripts
├── utils/               # Utility functions
├── server.js            # Main server file
└── package.json         # Dependencies
```

## 🔧 Configuration Files (`config/`)

### 1. `database.js`
- **Purpose**: Database connection pool and table initialization
- **Exports**: `pool`, `initializeDatabase`
- **Features**:
  - PostgreSQL connection pool setup
  - SSL support for Supabase
  - Automatic table creation
  - Index creation for performance

### 2. `cloudinary.js`
- **Purpose**: Cloudinary image upload configuration
- **Exports**: Cloudinary instance
- **Features**: Image upload for employee profile photos

### 3. `supabase.js`
- **Purpose**: Supabase client initialization
- **Exports**: Supabase client instances
- **Features**: Connection to Supabase cloud database

## 🎮 Controllers (`controllers/`)

### 1. `auth.controller.js`
- **Functions**:
  - `login` - User authentication
  - `register` - Admin-only user registration
  - `registerFirstUser` - HR Executive self-registration
- **Features**:
  - JWT token generation
  - Password hashing with bcrypt
  - Password validation
  - Auto-login after registration

### 2. `employee.controller.js`
- **Functions**:
  - `getEmployees` - Get all employees
  - `getEmployee` - Get single employee
  - `createEmployee` - Create new employee
  - `updateEmployee` - Update employee
  - `deleteEmployee` - Delete employee
  - `uploadPhoto` - Upload profile photo
- **Features**:
  - Cloudinary integration
  - Employee ID generation
  - Profile photo upload

### 3. `attendance.controller.js`
- **Functions**:
  - `markAttendance` - Mark attendance
  - `getAttendance` - Get attendance record
  - `getDailyAttendance` - Get daily attendance
  - `getMonthlyAttendance` - Get monthly attendance
  - `getEmployeeAttendance` - Get employee attendance history
- **Features**:
  - Present/Absent/Late status
  - Check-in/Check-out times
  - Location tracking (office/remote)

### 4. `leave.controller.js`
- **Functions**:
  - `applyLeave` - Apply for leave
  - `getLeaves` - Get all leaves
  - `getLeave` - Get single leave
  - `getEmployeeLeaves` - Get employee leaves
  - `approveLeave` - Approve leave (Admin only)
  - `rejectLeave` - Reject leave (Admin only)
- **Features**:
  - Multiple leave types
  - Notification system integration
  - Status management (pending/approved/rejected)

### 5. `onboarding.controller.js`
- **Functions**:
  - `getOnboardings` - Get all onboarding records
  - `getOnboarding` - Get single onboarding
  - `startOnboarding` - Start onboarding process
  - `updateOnboarding` - Update onboarding progress
- **Features**:
  - 5-stage onboarding workflow
  - Progress calculation (0-100%)
  - Status tracking

### 6. `payroll.controller.js`
- **Functions**:
  - `getPayrolls` - Get all payrolls
  - `getPayroll` - Get single payroll
  - `createPayroll` - Create payroll record
  - `updatePayroll` - Update payroll
  - `processPayroll` - Process payroll for all employees
- **Features**:
  - Salary calculation
  - Allowances and deductions
  - Paid/Unpaid status tracking

### 7. `recruitment.controller.js`
- **Functions**:
  - `getJobPostings` - Get all job postings
  - `getJobPosting` - Get single job posting
  - `createJobPosting` - Create job posting
  - `updateJobPosting` - Update job posting
  - `deleteJobPosting` - Delete job posting
  - `updateApplicationCount` - Update application count
- **Features**:
  - Job posting management
  - Notification system integration
  - Application tracking

### 8. `dashboard.controller.js`
- **Functions**:
  - `getDashboardStats` - Get dashboard statistics
- **Features**:
  - Total employees count
  - Active employees count
  - Employees on leave
  - Active job postings count

### 9. `notification.controller.js`
- **Functions**:
  - `createNotification` - Create notification
  - `getNotifications` - Get user notifications
  - `markAsRead` - Mark notification as read
  - `markAllAsRead` - Mark all as read
  - `deleteNotification` - Delete notification
- **Features**:
  - Multiple notification types
  - Unread count tracking
  - Notification linking to entities

### 10. `reports.controller.js`
- **Functions**:
  - `getEmployeeReport` - Employee reports
  - `getAttendanceReport` - Attendance reports
  - `getLeaveReport` - Leave reports
  - `getPayrollReport` - Payroll reports
- **Features**:
  - Filtering and querying
  - Summary calculations

### 11. `settings.controller.js`
- **Functions**:
  - `getSettings` - Get all settings
  - `getSetting` - Get single setting
  - `updateSettings` - Update multiple settings
  - `updateSetting` - Update single setting
- **Features**:
  - Key-value settings storage
  - Admin-only updates

### 12. `activity.controller.js`
- **Functions**:
  - `getActivities` - Get activity logs
  - `createActivity` - Create activity log
- **Features**:
  - Activity tracking
  - Metadata storage

## 🛣️ Routes (`routes/`)

### 1. `auth.routes.js`
- **Endpoints**:
  - `POST /api/auth/login` - Login
  - `POST /api/auth/register` - Register (Admin only)
  - `POST /api/auth/register-first` - HR self-registration

### 2. `employee.routes.js`
- **Endpoints**:
  - `GET /api/employees` - Get all employees
  - `GET /api/employees/:id` - Get employee
  - `POST /api/employees` - Create employee (Admin/HR)
  - `PUT /api/employees/:id` - Update employee (Admin/HR)
  - `DELETE /api/employees/:id` - Delete employee (Admin)
  - `POST /api/employees/:id/photo` - Upload photo (Admin/HR)

### 3. `attendance.routes.js`
- **Endpoints**:
  - `POST /api/attendance` - Mark attendance (Admin/HR)
  - `GET /api/attendance/:id` - Get attendance
  - `GET /api/attendance/daily/:date` - Daily attendance
  - `GET /api/attendance/monthly/:year/:month` - Monthly attendance
  - `GET /api/attendance/employee/:employeeId` - Employee attendance

### 4. `leave.routes.js`
- **Endpoints**:
  - `POST /api/leaves` - Apply for leave
  - `GET /api/leaves` - Get all leaves
  - `GET /api/leaves/:id` - Get leave
  - `GET /api/leaves/employee/:employeeId` - Employee leaves
  - `PUT /api/leaves/:id/approve` - Approve leave (Admin)
  - `PUT /api/leaves/:id/reject` - Reject leave (Admin)

### 5. `onboarding.routes.js`
- **Endpoints**:
  - `GET /api/onboarding` - Get all onboardings
  - `GET /api/onboarding/:id` - Get onboarding
  - `POST /api/onboarding` - Start onboarding (Admin/HR)
  - `PUT /api/onboarding/:id` - Update onboarding (Admin/HR)

### 6. `payroll.routes.js`
- **Endpoints**:
  - `GET /api/payroll` - Get all payrolls
  - `GET /api/payroll/:id` - Get payroll
  - `POST /api/payroll` - Create payroll (Admin/HR)
  - `POST /api/payroll/process` - Process payroll (Admin)
  - `PUT /api/payroll/:id` - Update payroll (Admin/HR)

### 7. `recruitment.routes.js`
- **Endpoints**:
  - `GET /api/recruitment` - Get job postings
  - `GET /api/recruitment/:id` - Get job posting
  - `POST /api/recruitment` - Create job posting (Admin/HR)
  - `PUT /api/recruitment/:id` - Update job posting (Admin/HR)
  - `DELETE /api/recruitment/:id` - Delete job posting (Admin)
  - `PUT /api/recruitment/:id/applications` - Update application count

### 8. `dashboard.routes.js`
- **Endpoints**:
  - `GET /api/dashboard/stats` - Get dashboard statistics

### 9. `notification.routes.js`
- **Endpoints**:
  - `GET /api/notifications` - Get notifications
  - `PUT /api/notifications/:id/read` - Mark as read
  - `PUT /api/notifications/read-all` - Mark all as read
  - `DELETE /api/notifications/:id` - Delete notification

### 10. `reports.routes.js`
- **Endpoints**:
  - `GET /api/reports/employees` - Employee reports
  - `GET /api/reports/attendance` - Attendance reports
  - `GET /api/reports/leaves` - Leave reports
  - `GET /api/reports/payroll` - Payroll reports

### 11. `settings.routes.js`
- **Endpoints**:
  - `GET /api/settings` - Get all settings
  - `GET /api/settings/:key` - Get setting
  - `PUT /api/settings` - Update settings (Admin)
  - `PUT /api/settings/:key` - Update setting (Admin)

## 🔐 Middleware (`middleware/`)

### 1. `auth.middleware.js`
- **Functions**:
  - `authenticate` - Verify JWT token
  - `authorize` - Check user role permissions
- **Features**:
  - Token validation
  - Role-based access control

## 🛠️ Utilities (`utils/`)

### 1. `passwordValidator.js`
- **Functions**:
  - `validatePassword` - Validate password strength
  - `getPasswordStrength` - Get password strength level
- **Features**:
  - Minimum 8 characters
  - Uppercase letter required
  - Lowercase letter required
  - Number required
  - Special character required

## 📄 Main Files

### 1. `server.js`
- **Purpose**: Express server setup and configuration
- **Features**:
  - CORS configuration
  - JSON body parsing
  - Route registration
  - Error handling
  - 404 handlers
  - Health check endpoint

### 2. `package.json`
- **Dependencies**:
  - `express` - Web framework
  - `cors` - CORS middleware
  - `dotenv` - Environment variables
  - `pg` - PostgreSQL client
  - `bcryptjs` - Password hashing
  - `jsonwebtoken` - JWT tokens
  - `cloudinary` - Image upload
  - `multer` - File upload
  - `@supabase/supabase-js` - Supabase client

## ✅ All Files Status

- ✅ All 12 controllers implemented
- ✅ All 11 routes implemented
- ✅ All middleware implemented
- ✅ All utilities implemented
- ✅ All configuration files implemented
- ✅ Password validation integrated
- ✅ Notification system integrated
- ✅ Error handling implemented
- ✅ Authentication & authorization working

## 🚀 Server Startup

```bash
cd backend
node server.js
```

Or with nodemon:
```bash
npm run dev
```

The server will:
1. Connect to the database
2. Initialize all tables
3. Register all routes
4. Start listening on the configured port (default: 5001)


