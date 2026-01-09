// API Base URL configuration
// Priority: 1. VITE_API_URL env var, 2. Localhost fallback (dev only)
const getApiBaseUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, VITE_API_URL MUST be set
  // This is a fallback that will show an error if not configured
  if (import.meta.env.PROD) {
    console.error('❌ VITE_API_URL is not set in production!');
    console.error('❌ Please set it in Vercel environment variables.');
    // Return a placeholder that will cause clear errors
    return 'https://backend-url-not-configured/api';
  }
  
  // Development fallback - localhost
  return 'http://localhost:5001/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface LoginResponse {
  token: string
  user: {
    id: number
    email: string
    role: string
  }
}

export interface RegisterResponse {
  message: string
  token?: string
  user: {
    id: number
    email: string
    role: string
  }
  employee?: {
    id: number
    employee_id: string
    first_name: string
    last_name: string
    email: string
    [key: string]: any
  }
}

export interface ApiError {
  message: string
}

export interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  department?: string
  position?: string
  address?: string
  status: string
  hire_date?: string
  profile_photo?: string
  salary?: number | string
  bank_details_url?: string
  pan_card_url?: string
  aadhar_card_url?: string
  bank_account_no?: string
  bank_name?: string
  bank_ifsc?: string
  bank_verified?: boolean
  bank_account_holder_name?: string
  pan_number?: string
  pan_verified?: boolean
  pan_name?: string
  pan_dob?: string
  aadhar_number?: string
  aadhar_verified?: boolean
  aadhar_name?: string
  aadhar_dob?: string
  verification_score?: number
  verification_status?: 'pending' | 'review_required' | 'approved' | 'rejected'
  verification_flags?: Array<{
    type: string
    severity: 'low' | 'medium' | 'high'
    message: string
    documents: string[]
  }>
  hr_approved?: boolean
  hr_approved_by?: number
  hr_approved_at?: string
}

export interface Payroll {
  id?: number
  payroll_id?: number
  employee_id: number
  month?: number
  year?: number
  basic_salary?: number
  allowances?: number
  deductions?: number
  leave_deduction?: number
  tds?: number
  net_salary?: number
  salary?: number
  status?: string
  payment_status?: string
  first_name?: string
  last_name?: string
  emp_id?: string
  email?: string
  department?: string
  position?: string
}

export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  onLeave: number
  activeJobPostings: number
}

class ApiService {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
    
    // Validate API URL format
    if (!this.baseURL.endsWith('/api')) {
      console.warn('⚠️ Warning: API_BASE_URL should end with "/api". Current:', this.baseURL)
      console.warn('⚠️ This may cause routing issues. Expected format: http://host:port/api or https://host/api')
    }
    
    // Log the configured API URL (helpful for debugging)
    console.log('🔧 API Service initialized with base URL:', this.baseURL)
    console.log('🔧 Environment:', import.meta.env.PROD ? 'Production' : 'Development')
    console.log('🔧 VITE_API_URL env var:', import.meta.env.VITE_API_URL || 'not set (using fallback)')
    console.log('🔧 Frontend URL: https://kiwi-shraddha.vercel.app')
    
    // Warn if using localhost in production
    if (this.baseURL.includes('localhost') && import.meta.env.PROD) {
      console.error('❌ ERROR: Using localhost API URL in production!')
      console.error('❌ This will not work. Set VITE_API_URL in Vercel environment variables.')
      console.error('❌ Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
      console.error('❌ Add: VITE_API_URL=https://your-backend-service.run.app/api')
    }
    
    // Warn if backend URL is placeholder
    if (this.baseURL.includes('your-backend-service')) {
      console.error('❌ ERROR: Backend URL is not configured!')
      console.error('❌ Set VITE_API_URL in Vercel environment variables to your actual backend URL')
    }
  }

  private getAuthHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    // Log the request URL in development
    if (import.meta.env.DEV) {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`)
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error(`❌ Non-JSON response from ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: textResponse.substring(0, 200)
        })
        
        if (response.status === 404) {
          throw new Error(`API endpoint not found: ${options.method || 'GET'} ${url}. Please check that the backend is running and the API URL is correct.`)
        }
        throw new Error(`Server returned non-JSON response. Status: ${response.status}. URL: ${url}`)
      }

      const data = await response.json()

      if (!response.ok) {
        // Log detailed error information
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url,
          method: options.method || 'GET',
          error: data
        }
        console.error(`❌ API Error (${response.status}):`, errorDetails)
        console.error(`❌ Error Message:`, data.message || `HTTP error! status: ${response.status}`)
        console.error(`❌ Full Error Response:`, JSON.stringify(data, null, 2))
        
        const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).response = { data, url, status: response.status }
        throw error
      }

      return data
    } catch (error) {
      const errorInfo = {
        url,
        method: options.method || 'GET',
        error: error instanceof Error ? error.message : String(error),
        baseURL: this.baseURL
      }
      console.error('❌ API Request failed:', errorInfo)
      
      // If error has response data, log it
      if (error instanceof Error && (error as any).response) {
        console.error('❌ Response Details:', JSON.stringify((error as any).response, null, 2))
      }
      
      // Log the full error for debugging
      console.error('❌ Full Error Object:', error)
      
      if (error instanceof Error) {
        // Handle network errors (server not reachable, CORS, etc.)
        if (
          error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('CORS')
        ) {
          throw new Error(`Cannot connect to backend server at ${this.baseURL}. Please ensure the backend server is running and accessible. Attempted URL: ${url}`)
        }
        throw error
      }
      throw new Error('An unexpected error occurred')
    }
  }

  // Auth APIs
  async forgotPassword(email: string): Promise<{ message: string; resetLink?: string }> {
    const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send reset email')
    }

    return response.json()
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to reset password')
    }

    return response.json()
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  // Admin-only user creation (requires token)
  async createUser(token: string, data: { email: string; password: string; role?: string }): Promise<RegisterResponse> {
    if (!token) {
      throw new Error('Authentication token is required to create users')
    }
    
    // Validate data before sending
    if (!data.email || !data.password) {
      throw new Error('Email and password are required')
    }
    
    console.log('📤 Create user API call (admin):', { 
      email: data.email,
      role: data.role || 'hr_executive',
      hasPassword: !!data.password 
    })
    
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        email: data.email.trim(),
        password: data.password,
        role: data.role || 'hr_executive',
      }),
    })
  }


  async getUsers(token: string): Promise<Array<{ id: number; email: string; role: string; created_at: string }>> {
    return this.request<Array<{ id: number; email: string; role: string; created_at: string }>>('/auth/users', {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  // Employee APIs
  async getEmployees(token: string): Promise<Employee[]> {
    return this.request<Employee[]>('/employees', {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async getEmployee(id: string | number, token: string): Promise<Employee> {
    return this.request<Employee>(`/employees/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async createEmployee(data: Partial<Employee>, token: string): Promise<Employee> {
    return this.request<Employee>('/employees', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async updateEmployee(id: string | number, data: Partial<Employee>, token: string): Promise<Employee> {
    return this.request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async deleteEmployee(id: string | number, token: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/employees/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    })
  }

  async uploadEmployeePhoto(id: string | number, photoFile: File, token: string): Promise<any> {
    const formData = new FormData()
    formData.append('photo', photoFile)
    
    const url = `${this.baseURL}/employees/${id}/photo`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload photo')
    }

    return response.json()
  }

  async uploadBankDetails(id: string | number, file: File, token: string): Promise<any> {
    const formData = new FormData()
    formData.append('bank_details', file)
    
    const url = `${this.baseURL}/employees/${id}/bank-details`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload bank details')
    }

    return response.json()
  }

  async uploadPanCard(id: string | number, file: File, token: string): Promise<any> {
    const formData = new FormData()
    formData.append('pan_card', file)
    
    const url = `${this.baseURL}/employees/${id}/pan-card`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload PAN card')
    }

    return response.json()
  }

  async uploadAadharCard(id: string | number, file: File, token: string): Promise<any> {
    const formData = new FormData()
    formData.append('aadhar_card', file)
    
    const url = `${this.baseURL}/employees/${id}/aadhar-card`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to upload Aadhar card')
    }

    return response.json()
  }

  // Verification-only endpoints (no employee ID required)
  async verifyBankDetails(file: File, token: string): Promise<any> {
    const formData = new FormData()
    formData.append('bank_details', file)
    
    const url = `${this.baseURL}/employees/verify/bank-details`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to verify bank details')
    }

    return response.json()
  }

  async verifyPanCard(file: File, token: string): Promise<any> {
    const formData = new FormData()
    formData.append('pan_card', file)
    
    const url = `${this.baseURL}/employees/verify/pan-card`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    const data = await response.json()
    
    // Backend now always returns 200, but may have error in response
    if (data.error && !data.extractedData?.panNumber) {
      throw new Error(data.error || 'Failed to verify PAN card')
    }

    return data
  }

  async verifyAadharCard(file: File, token: string): Promise<any> {
    try {
      const formData = new FormData()
      formData.append('aadhar_card', file)
      
      const url = `${this.baseURL}/employees/verify/aadhar-card`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      // Handle connection errors
      if (!response.ok && response.status === 0) {
        throw new Error('Cannot connect to server. Please ensure the backend server is running on port 5002.')
      }

      const data = await response.json()
      
      // Backend now always returns 200, but may have error in response
      if (data.error && !data.extractedData?.aadharNumber) {
        throw new Error(data.error || 'Failed to verify Aadhar card')
      }

      return data
    } catch (error: any) {
      // Handle network errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        throw new Error('Cannot connect to server. Please ensure the backend server is running on port 5002.')
      }
      throw error
    }
  }

  // Dashboard APIs
  async getDashboardStats(token: string): Promise<DashboardStats> {
    console.log('🌐 Calling dashboard stats API...')
    const data = await this.request<DashboardStats>('/dashboard/stats', {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
    console.log('📥 Dashboard stats response:', data)
    return data
  }

  async getDailyAttendanceStats(token: string, days: number = 7): Promise<any[]> {
    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now()
    return this.request<any[]>(`/dashboard/attendance-stats?days=${days}&_t=${timestamp}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  // Payroll APIs
  async getPayrolls(token: string, month?: number, year?: number, employeeId?: number, allEmployees?: boolean): Promise<Payroll[]> {
    let endpoint = '/payroll'
    const params = []
    if (month) params.push(`month=${month}`)
    if (year) params.push(`year=${year}`)
    if (employeeId) params.push(`employee_id=${employeeId}`)
    if (allEmployees) params.push(`all_employees=true`)
    if (params.length > 0) endpoint += `?${params.join('&')}`
    
    return this.request<Payroll[]>(endpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async getPayroll(id: string | number, token: string): Promise<Payroll> {
    return this.request<Payroll>(`/payroll/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async createPayroll(data: Partial<Payroll>, token: string): Promise<Payroll> {
    return this.request<Payroll>('/payroll', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async updatePayroll(id: string | number, data: Partial<Payroll>, token: string): Promise<Payroll> {
    return this.request<Payroll>(`/payroll/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  // Recruitment APIs
  async getJobPostings(token: string, status?: string): Promise<any[]> {
    let endpoint = '/recruitment'
    if (status) {
      endpoint += `?status=${status}`
    }
    return this.request<any[]>(endpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async createJobPosting(data: any, token: string): Promise<any> {
    return this.request<any>('/recruitment', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async updateJobPosting(id: number, data: any, token: string): Promise<any> {
    return this.request<any>(`/recruitment/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async deleteJobPosting(id: number, token: string): Promise<any> {
    return this.request<any>(`/recruitment/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    })
  }

  // Attendance APIs
  async getEmployeesWithAttendance(token: string, date?: string): Promise<any[]> {
    let endpoint = '/attendance/employees'
    if (date) {
      endpoint += `?date=${date}`
    }
    return this.request<any[]>(endpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async markAttendance(data: { employee_id: number; date: string; status: string }, token: string): Promise<any> {
    return this.request<any>('/attendance', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async getMonthlyAttendance(token: string, year: number, month: number): Promise<any[]> {
    return this.request<any[]>(`/attendance/monthly/${year}/${month}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async getEmployeeAttendance(token: string, employeeId: number, startDate?: string, endDate?: string): Promise<any[]> {
    let url = `/attendance/employee/${employeeId}`
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += `?${params.toString()}`
    
    return this.request<any[]>(url, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  // Leave APIs
  async createLeave(data: { employee_id: number; leave_type: string; start_date: string; end_date: string; reason?: string }, token: string): Promise<any> {
    return this.request<any>('/leaves', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async getUpcomingLeaves(token: string): Promise<any[]> {
    return this.request<any[]>('/leaves?status=approved&upcoming=true', {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async getLeaves(token: string, status?: string, upcoming?: boolean): Promise<any[]> {
    let endpoint = '/leaves'
    const params = []
    if (status) params.push(`status=${status}`)
    if (upcoming) params.push(`upcoming=true`)
    if (params.length > 0) endpoint += `?${params.join('&')}`
    
    return this.request<any[]>(endpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  // Performance APIs
  async getMonthlyPerformance(token: string, month: number, year: number): Promise<any[]> {
    return this.request<any[]>(`/performance/monthly?month=${month}&year=${year}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async createOrUpdatePerformance(data: any, token: string): Promise<any> {
    return this.request<any>('/performance', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    })
  }

  async deletePerformance(id: number, token: string): Promise<any> {
    return this.request<any>(`/performance/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    })
  }

  // Settings API
  async getSettings(token: string): Promise<any[]> {
    return this.request<any[]>(`/settings`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async getSetting(token: string, key: string): Promise<any> {
    return this.request<any>(`/settings/${key}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async updateSettings(token: string, settings: Array<{ key: string; value: string }>): Promise<any> {
    return this.request<any>(`/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ settings }),
    })
  }

  async updateSetting(token: string, key: string, value: string): Promise<any> {
    return this.request<any>(`/settings/${key}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ value }),
    })
  }

  // Accounting API
  async getAccountingData(token: string, month: number, year: number): Promise<any> {
    return this.request<any>(`/accounting?month=${month}&year=${year}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async syncSalaryFromPayroll(token: string, month: number, year: number): Promise<any> {
    return this.request<any>(`/accounting/sync-salary?month=${month}&year=${year}`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    })
  }

  async updateAccountingAmount(token: string, headId: number, amount: number, month: number, year: number): Promise<any> {
    return this.request<any>(`/accounting/${headId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ amount, month, year }),
    })
  }

  async initializeAccountingEntries(token: string, month: number, year: number): Promise<any> {
    return this.request<any>(`/accounting/initialize`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ month, year }),
    })
  }

  async createAccountingEntry(token: string, entry: {
    head: string;
    subhead?: string;
    tdsPercentage?: number;
    gstPercentage?: number;
    frequency?: string;
    remarks?: string;
    amount?: number;
    month: number;
    year: number;
  }): Promise<any> {
    return this.request<any>(`/accounting`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(entry),
    })
  }

  async deleteAccountingEntry(token: string, id: number): Promise<any> {
    return this.request<any>(`/accounting/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    })
  }
}

export const apiService = new ApiService()
