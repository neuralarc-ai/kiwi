# HR Management System - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. Authentication Endpoints

### POST /api/auth/login
Login and get JWT token.

**Request Body:**
```json
{
  "email": "admin@hr.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@hr.com",
    "role": "admin"
  }
}
```

### POST /api/auth/register
Register new user (Admin only).

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "email": "hr@hr.com",
  "password": "password123",
  "role": "hr_executive"
}
```

---

## 2. Employee Management Endpoints

### GET /api/employees
Get all employees (requires authentication).

**Response:**
```json
[
  {
    "id": 1,
    "employee_id": "EMP001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@company.com",
    "phone": "1234567890",
    "department": "Engineering",
    "position": "Developer",
    "hire_date": "2024-01-15",
    "salary": 5000.00,
    "profile_photo": "https://...",
    "status": "active"
  }
]
```

### GET /api/employees/:id
Get single employee by ID.

### POST /api/employees
Create new employee (Admin/HR Executive only).

**Request Body:**
```json
{
  "employee_id": "EMP002",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@company.com",
  "phone": "0987654321",
  "department": "Marketing",
  "position": "Manager",
  "hire_date": "2024-02-01",
  "salary": 6000.00,
  "address": "123 Main St",
  "status": "active"
}
```

### PUT /api/employees/:id
Update employee (Admin/HR Executive only).

### DELETE /api/employees/:id
Delete employee (Admin only).

### POST /api/employees/:id/photo
Upload profile photo (Admin/HR Executive only).

**Content-Type:** `multipart/form-data`

**Form Data:**
- `photo`: Image file (max 5MB)

---

## 3. Attendance Management Endpoints

### POST /api/attendance
Mark attendance (Admin/HR Executive only).

**Request Body:**
```json
{
  "employee_id": 1,
  "date": "2025-01-15",
  "status": "present",
  "check_in_time": "09:00:00",
  "check_out_time": "18:00:00",
  "location": "office",
  "notes": "On time"
}
```

**Status values:** `present`, `absent`, `late`

**Location values:** `office`, `remote`

### GET /api/attendance/daily/:date
Get daily attendance for a specific date.

**Example:** `/api/attendance/daily/2025-01-15`

### GET /api/attendance/monthly/:year/:month
Get monthly attendance.

**Example:** `/api/attendance/monthly/2025/1`

### GET /api/attendance/employee/:employeeId
Get employee attendance history.

**Query Parameters:**
- `startDate`: Optional start date filter
- `endDate`: Optional end date filter

---

## 4. Leave Management Endpoints

### POST /api/leaves
Apply for leave.

**Request Body:**
```json
{
  "employee_id": 1,
  "leave_type": "sick",
  "start_date": "2025-01-20",
  "end_date": "2025-01-22",
  "reason": "Medical appointment"
}
```

**Leave types:** `sick`, `vacation`, `personal`, `emergency`, `other`

### GET /api/leaves
Get all leaves (filtered by user role).

### GET /api/leaves/:id
Get single leave record.

### GET /api/leaves/employee/:employeeId
Get employee leave history.

### PUT /api/leaves/:id/approve
Approve leave (Admin only).

### PUT /api/leaves/:id/reject
Reject leave (Admin only).

---

## 5. Onboarding Endpoints

### GET /api/onboarding
Get all onboarding records.

**Query Parameters:**
- `status`: Filter by status (`in_progress`, `completed`, `on_hold`)

### GET /api/onboarding/:id
Get single onboarding record.

### POST /api/onboarding
Start onboarding for employee (Admin/HR Executive only).

**Request Body:**
```json
{
  "employee_id": 1
}
```

### PUT /api/onboarding/:id
Update onboarding progress (Admin/HR Executive only).

**Request Body:**
```json
{
  "personal_info_completed": true,
  "documents_uploaded": true,
  "digital_signature_completed": false,
  "it_setup_completed": false,
  "orientation_completed": false
}
```

---

## 6. Payroll Management Endpoints

### GET /api/payroll
Get payroll records.

**Query Parameters:**
- `month`: Filter by month (1-12)
- `year`: Filter by year
- `employee_id`: Filter by employee

### GET /api/payroll/:id
Get single payroll record.

### POST /api/payroll
Create payroll record (Admin/HR Executive only).

**Request Body:**
```json
{
  "employee_id": 1,
  "month": 1,
  "year": 2025,
  "basic_salary": 5000.00,
  "allowances": 500.00,
  "deductions": 250.00
}
```

### POST /api/payroll/process
Process payroll for all active employees (Admin only).

**Request Body:**
```json
{
  "month": 1,
  "year": 2025
}
```

### PUT /api/payroll/:id
Update payroll record (Admin/HR Executive only).

---

## 7. Reports Endpoints

### GET /api/reports/employees
Get employee directory report.

**Query Parameters:**
- `department`: Filter by department
- `status`: Filter by status (`active`, `on_leave`, `inactive`)

### GET /api/reports/attendance
Get attendance report.

**Query Parameters:**
- `start_date`: Start date filter
- `end_date`: End date filter
- `employee_id`: Filter by employee

### GET /api/reports/leaves
Get leave report.

**Query Parameters:**
- `start_date`: Start date filter
- `end_date`: End date filter
- `status`: Filter by status
- `leave_type`: Filter by leave type

### GET /api/reports/payroll
Get payroll report.

**Query Parameters:**
- `month`: Filter by month
- `year`: Filter by year

**Response includes summary:**
```json
{
  "payrolls": [...],
  "summary": {
    "totalPayroll": 2847500.00,
    "totalEmployees": 1247,
    "averageSalary": 2285.00
  }
}
```

---

## 8. Settings Endpoints

### GET /api/settings
Get all settings (Admin only).

### GET /api/settings/:key
Get specific setting by key.

### PUT /api/settings
Update multiple settings (Admin only).

**Request Body:**
```json
{
  "company_name": "My Company",
  "working_hours": "9:00 AM - 6:00 PM",
  "annual_leave_days": "20",
  "sick_leave_days": "10"
}
```

### PUT /api/settings/:key
Update single setting (Admin only).

---

## 9. Health Check

### GET /api/health
Check server status.

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Role-Based Access

### Admin
- Full access to all endpoints
- Can create users
- Can delete employees
- Can approve/reject leaves
- Can process payroll
- Can manage settings

### HR Executive
- Can manage employees (add, edit)
- Can mark attendance
- Can view all data
- Cannot delete employees
- Cannot approve leaves
- Cannot process payroll
- Cannot manage settings

### Employee (Future)
- View own profile
- Apply for leave
- View own attendance
- View own payroll

---

## Testing the API

### Using cURL

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hr.com","password":"password123"}'
```

**Get Employees (with token):**
```bash
curl -X GET http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. Import the collection (if available)
2. Set base URL: `http://localhost:5000/api`
3. For protected routes, add header:
   - Key: `Authorization`
   - Value: `Bearer <your_token>`

---

## Database Schema

All tables are automatically created on server start. See `backend/config/database.js` for schema details.


