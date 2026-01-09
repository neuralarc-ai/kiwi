# Backend API Endpoints - Testing Guide

Base URL: `https://kiwi-backend-299314838732.asia-south1.run.app/api`

**Note**: Replace `YOUR_TOKEN` with actual JWT token from login response.

---

## 🔐 Authentication Endpoints

### 1. Login (Public)
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

---

### 2. Register User (Protected - Admin/HR Executive only)
```http
POST /api/auth/register
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "hr_executive"
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"newuser@example.com","password":"password123","role":"hr_executive"}'
```

---

### 3. Register First User (Public - First admin setup only)
```http
POST /api/auth/register-first
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/auth/register-first \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

---

### 4. Get All Users (Protected - Admin/HR Executive only)
```http
GET /api/auth/users
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/auth/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 👥 Employee Endpoints

### 5. Get All Employees (Protected)
```http
GET /api/employees
```

**Query Parameters (optional):**
- `status`: Filter by status (active, inactive)
- `department`: Filter by department

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Get Single Employee (Protected)
```http
GET /api/employees/:id
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/employees/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 7. Create Employee (Protected - Admin/HR Executive only)
```http
POST /api/employees
```

**Request Body:**
```json
{
  "employee_id": "EMP001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "position": "Software Engineer",
  "address": "123 Main St",
  "status": "active",
  "hire_date": "2024-01-15",
  "salary": 75000
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": "EMP001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "position": "Software Engineer",
    "status": "active"
  }'
```

---

### 8. Update Employee (Protected - Admin/HR Executive only)
```http
PUT /api/employees/:id
```

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "department": "Marketing",
  "salary": 80000
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/employees/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"first_name":"Jane","department":"Marketing"}'
```

---

### 9. Delete Employee (Protected - Admin only)
```http
DELETE /api/employees/:id
```

**cURL:**
```bash
curl -X DELETE https://kiwi-backend-299314838732.asia-south1.run.app/api/employees/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 10. Upload Employee Photo (Protected - Admin/HR Executive only)
```http
POST /api/employees/:id/photo
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `photo`: Image file (max 5MB)

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/employees/1/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/image.jpg"
```

---

## 📅 Attendance Endpoints

### 11. Mark Attendance (Protected - Admin/HR Executive only)
```http
POST /api/attendance
```

**Request Body:**
```json
{
  "employee_id": 1,
  "date": "2024-01-15",
  "status": "present"
}
```

**Status values:** `present`, `absent`, `late`, `half_day`

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"employee_id":1,"date":"2024-01-15","status":"present"}'
```

---

### 12. Get Employees with Attendance Status (Protected)
```http
GET /api/attendance/employees
```

**Query Parameters:**
- `date`: Date in YYYY-MM-DD format (optional)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/attendance/employees?date=2024-01-15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 13. Get Attendance by ID (Protected)
```http
GET /api/attendance/:id
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/attendance/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 14. Get Daily Attendance (Protected)
```http
GET /api/attendance/daily/:date
```

**Date format:** YYYY-MM-DD

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/attendance/daily/2024-01-15 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 15. Get Monthly Attendance (Protected)
```http
GET /api/attendance/monthly/:year/:month
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/attendance/monthly/2024/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 16. Get Employee Attendance History (Protected)
```http
GET /api/attendance/employee/:employeeId
```

**Query Parameters (optional):**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/attendance/employee/1?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🏖️ Leave Endpoints

### 17. Apply for Leave (Protected)
```http
POST /api/leaves
```

**Request Body:**
```json
{
  "employee_id": 1,
  "leave_type": "sick",
  "start_date": "2024-01-20",
  "end_date": "2024-01-22",
  "reason": "Medical appointment"
}
```

**Leave types:** `sick`, `vacation`, `personal`, `maternity`, `paternity`, `other`

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/leaves \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": 1,
    "leave_type": "sick",
    "start_date": "2024-01-20",
    "end_date": "2024-01-22",
    "reason": "Medical appointment"
  }'
```

---

### 18. Get All Leaves (Protected)
```http
GET /api/leaves
```

**Query Parameters (optional):**
- `status`: Filter by status (pending, approved, rejected)
- `employee_id`: Filter by employee

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/leaves \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 19. Get Single Leave (Protected)
```http
GET /api/leaves/:id
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/leaves/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 20. Get Employee Leaves (Protected)
```http
GET /api/leaves/employee/:employeeId
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/leaves/employee/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 21. Approve Leave (Protected - Admin only)
```http
PUT /api/leaves/:id/approve
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/leaves/1/approve \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💰 Payroll Endpoints

### 23. Get All Payrolls (Protected)
```http
GET /api/payroll
```

**Query Parameters (optional):**
- `month`: Month (1-12)
- `year`: Year (YYYY)
- `employee_id`: Filter by employee
- `all_employees`: Boolean (true/false)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/payroll?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 24. Get Single Payroll (Protected)
```http
GET /api/payroll/:id
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/payroll/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 25. Create Payroll (Protected - Admin/HR Executive only)
```http
POST /api/payroll
```

**Request Body:**
```json
{
  "employee_id": 1,
  "month": 1,
  "year": 2024,
  "basic_salary": 50000,
  "allowances": 5000,
  "deductions": 2000,
  "leave_deduction": 1000,
  "tds": 5000,
  "net_salary": 47000
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/payroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": 1,
    "month": 1,
    "year": 2024,
    "basic_salary": 50000,
    "allowances": 5000,
    "deductions": 2000,
    "net_salary": 47000
  }'
```

---

### 26. Process Payroll (Protected - Admin only)
```http
POST /api/payroll/process
```

**Request Body:**
```json
{
  "month": 1,
  "year": 2024,
  "employee_ids": [1, 2, 3]
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/payroll/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"month":1,"year":2024,"employee_ids":[1,2,3]}'
```

---

### 27. Update Payroll (Protected - Admin/HR Executive only)
```http
PUT /api/payroll/:id
```

**Request Body:**
```json
{
  "allowances": 6000,
  "deductions": 2500,
  "net_salary": 47500
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/payroll/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"allowances":6000,"net_salary":47500}'
```

---

## 📊 Dashboard Endpoints

### 28. Get Dashboard Statistics (Protected)
```http
GET /api/dashboard/stats
```

**Response:**
```json
{
  "totalEmployees": 50,
  "activeEmployees": 45,
  "onLeave": 3,
  "activeJobPostings": 5
}
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 29. Get Daily Attendance Statistics (Protected)
```http
GET /api/dashboard/attendance-stats
```

**Query Parameters:**
- `days`: Number of days (default: 7)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/dashboard/attendance-stats?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Recruitment Endpoints

### 30. Get All Job Postings (Protected)
```http
GET /api/recruitment
```

**Query Parameters (optional):**
- `status`: Filter by status (active, closed, draft)

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/recruitment \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 31. Get Single Job Posting (Protected)
```http
GET /api/recruitment/:id
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/recruitment/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 32. Create Job Posting (Protected - Admin/HR Executive only)
```http
POST /api/recruitment
```

**Request Body:**
```json
{
  "title": "Senior Software Engineer",
  "department": "Engineering",
  "location": "Remote",
  "type": "Full-time",
  "description": "We are looking for an experienced software engineer...",
  "requirements": "5+ years of experience, Node.js, React",
  "salary_range": "$80,000 - $120,000",
  "status": "active"
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/recruitment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Senior Software Engineer",
    "department": "Engineering",
    "location": "Remote",
    "type": "Full-time",
    "status": "active"
  }'
```

---

### 33. Update Job Posting (Protected - Admin/HR Executive only)
```http
PUT /api/recruitment/:id
```

**Request Body:**
```json
{
  "status": "closed",
  "applications_count": 25
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/recruitment/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status":"closed"}'
```

---

### 34. Delete Job Posting (Protected - Admin only)
```http
DELETE /api/recruitment/:id
```

**cURL:**
```bash
curl -X DELETE https://kiwi-backend-299314838732.asia-south1.run.app/api/recruitment/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 35. Update Application Count (Protected)
```http
PUT /api/recruitment/:id/applications
```

**Request Body:**
```json
{
  "applications_count": 30
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/recruitment/1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"applications_count":30}'
```

---

## ⚡ Performance Endpoints

### 36. Get Monthly Performance (Protected)
```http
GET /api/performance/monthly
```

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year (YYYY)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/performance/monthly?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 37. Create or Update Performance (Protected - Admin/HR Executive only)
```http
POST /api/performance
```

**Request Body:**
```json
{
  "employee_id": 1,
  "month": 1,
  "year": 2024,
  "rating": 4.5,
  "goals_achieved": 8,
  "goals_total": 10,
  "comments": "Excellent performance this month"
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/performance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employee_id": 1,
    "month": 1,
    "year": 2024,
    "rating": 4.5,
    "goals_achieved": 8,
    "goals_total": 10
  }'
```

---

### 38. Delete Performance (Protected - Admin/HR Executive only)
```http
DELETE /api/performance/:id
```

**cURL:**
```bash
curl -X DELETE https://kiwi-backend-299314838732.asia-south1.run.app/api/performance/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚙️ Settings Endpoints

### 39. Get All Settings (Protected)
```http
GET /api/settings
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 40. Get Single Setting (Protected)
```http
GET /api/settings/:key
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/settings/company_name \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 41. Update Settings (Protected - Admin/HR Executive only)
```http
PUT /api/settings
```

**Request Body:**
```json
{
  "settings": [
    {"key": "company_name", "value": "Acme Corp"},
    {"key": "company_email", "value": "info@acme.com"}
  ]
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "settings": [
      {"key": "company_name", "value": "Acme Corp"}
    ]
  }'
```

---

### 42. Update Single Setting (Protected - Admin/HR Executive only)
```http
PUT /api/settings/:key
```

**Request Body:**
```json
{
  "value": "New Company Name"
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/settings/company_name \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"value":"New Company Name"}'
```

---

## 📈 Accounting Endpoints

### 43. Get Accounting Data (Protected)
```http
GET /api/accounting
```

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year (YYYY)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/accounting?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 44. Initialize Accounting Entries (Protected - Admin/HR Executive only)
```http
POST /api/accounting/initialize
```

**Request Body:**
```json
{
  "month": 1,
  "year": 2024
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/accounting/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"month":1,"year":2024}'
```

---

### 45. Create Accounting Entry (Protected - Admin/HR Executive only)
```http
POST /api/accounting
```

**Request Body:**
```json
{
  "head": "Salary",
  "subhead": "Employee Salaries",
  "tds_percentage": 10,
  "gst_percentage": 0,
  "frequency": "monthly",
  "remarks": "Monthly salary payments",
  "amount": 500000,
  "month": 1,
  "year": 2024
}
```

**cURL:**
```bash
curl -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/accounting \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "head": "Salary",
    "amount": 500000,
    "month": 1,
    "year": 2024
  }'
```

---

### 46. Update Accounting Amount (Protected - Admin/HR Executive only)
```http
PUT /api/accounting/:id
```

**Request Body:**
```json
{
  "amount": 550000,
  "month": 1,
  "year": 2024
}
```

**cURL:**
```bash
curl -X PUT https://kiwi-backend-299314838732.asia-south1.run.app/api/accounting/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":550000,"month":1,"year":2024}'
```

---

### 47. Sync Salary from Payroll (Protected)
```http
GET /api/accounting/sync-salary
```

**Query Parameters:**
- `month`: Month (1-12)
- `year`: Year (YYYY)

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/accounting/sync-salary?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 48. Test Accounting Route (Protected)
```http
GET /api/accounting/test
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/accounting/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📋 Reports Endpoints

### 49. Get Employee Report (Protected)
```http
GET /api/reports/employees
```

**Query Parameters (optional):**
- `department`: Filter by department
- `status`: Filter by status

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/reports/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 50. Get Attendance Report (Protected)
```http
GET /api/reports/attendance
```

**Query Parameters (optional):**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `employee_id`: Filter by employee

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/reports/attendance?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 51. Get Leave Report (Protected)
```http
GET /api/reports/leaves
```

**Query Parameters (optional):**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `status`: Filter by status

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/reports/leaves?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 52. Get Payroll Report (Protected)
```http
GET /api/reports/payroll
```

**Query Parameters (optional):**
- `month`: Month (1-12)
- `year`: Year (YYYY)
- `employee_id`: Filter by employee

**cURL:**
```bash
curl -X GET "https://kiwi-backend-299314838732.asia-south1.run.app/api/reports/payroll?month=1&year=2024" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🏥 Health & Info Endpoints (Public)

### 53. Health Check (Public)
```http
GET /api/health
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/health
```

---

### 54. Test Public Endpoint (Public)
```http
GET /api/test-public
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/test-public
```

---

### 55. Version Info (Public)
```http
GET /api/version
```

**cURL:**
```bash
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/version
```

---

## 🔑 Authentication Notes

- **Public Endpoints**: No authentication required
  - `/api/auth/login`
  - `/api/auth/register-first`
  - `/api/health`
  - `/api/test-public`
  - `/api/version`

- **Protected Endpoints**: Require `Authorization: Bearer YOUR_TOKEN` header
  - All other endpoints require authentication

- **Role-Based Access**:
  - **Admin**: Full access to all endpoints
  - **HR Executive**: Most endpoints except user deletion and some admin-only features
  - **Employee**: Limited access (can view own data, apply for leaves)

---

## 📝 Testing Tips

1. **Get Token First**: Always start by calling `/api/auth/login` to get your JWT token
2. **Save Token**: Store the token from login response for subsequent requests
3. **Use Postman/Insomnia**: Import these endpoints into Postman or Insomnia for easier testing
4. **Check Response Codes**: 
   - `200`: Success
   - `201`: Created
   - `400`: Bad Request
   - `401`: Unauthorized
   - `403`: Forbidden
   - `404`: Not Found
   - `500`: Server Error

---

## 🔄 Quick Test Sequence

```bash
# 1. Health check
curl https://kiwi-backend-299314838732.asia-south1.run.app/api/health

# 2. Login and save token
TOKEN=$(curl -s -X POST https://kiwi-backend-299314838732.asia-south1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r '.token')

# 3. Use token for protected endpoint
curl -X GET https://kiwi-backend-299314838732.asia-south1.run.app/api/employees \
  -H "Authorization: Bearer $TOKEN"
```

---

**Last Updated**: 2024
**Base URL**: `https://kiwi-backend-299314838732.asia-south1.run.app/api`

