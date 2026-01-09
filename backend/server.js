import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import recruitmentRoutes from './routes/recruitment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import performanceRoutes from './routes/performance.routes.js';
import accountingRoutes from './routes/accounting.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Request logging middleware (before other middleware)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('📥 Incoming request:', {
    timestamp,
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    query: req.query,
    hasBody: !!req.body,
    hasAuthHeader: !!req.headers.authorization,
    contentType: req.headers['content-type'],
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50)
  });
  next();
});

// Middleware
// CORS configuration - allow frontend from Vercel, Cloud Run, and local development
const allowedOrigins = [
  'https://kiwi-shraddha.vercel.app',
  'https://hr-management-frontend-299314838732.asia-southeast1.run.app',
  'https://kiwi-frontend-299314838732.asia-south2.run.app', // Cloud Run frontend (asia-south2)
   'https://kiwi.he2.ai', 
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5002', 
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Normalize origin by removing trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Check if origin matches any allowed origin (with or without trailing slash)
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed || normalizedOrigin.startsWith(normalizedAllowed);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === 'production') {
        callback(null, true);
      } else {
        console.warn('⚠️ CORS blocked origin:', origin);
        console.warn('⚠️ Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection and initialize tables
async function startServer() {
  try {
    // Check JWT_SECRET configuration
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  WARNING: JWT_SECRET is not set in environment variables!');
      console.warn('⚠️  Using fallback secret. This is NOT secure for production!');
      console.warn('⚠️  Please set JWT_SECRET in your .env file or environment variables.');
    } else {
      console.log('✅ JWT_SECRET is configured');
    }
    
    console.log('🔌 Testing database connection...');
    console.log('🔌 Database config:', {
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'hr_management',
      user: process.env.DB_USER || 'postgres',
      hasPassword: !!process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('supabase')
    });
    
    // Test connection with timeout
    const connectionTest = await Promise.race([
      pool.query('SELECT NOW() as current_time, version() as db_version'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
      )
    ]);
    
    console.log('✅ Database connected successfully');
    console.log('✅ Database time:', connectionTest.rows[0]?.current_time);
    console.log('✅ Database version:', connectionTest.rows[0]?.db_version?.substring(0, 50) + '...');
    
    // Initialize database tables
    console.log('🔧 Initializing database tables...');
    await initializeDatabase();
    console.log('✅ Database tables initialized');
    
    // Verify users table exists and is accessible
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    if (tableCheck.rows.length > 0) {
      console.log('✅ Users table verified');
    } else {
      console.warn('⚠️ Users table not found - this may cause issues');
    }
  } catch (error) {
    console.error('❌ ==========================================');
    console.error('❌ Database connection error');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error detail:', error.detail);
    console.error('❌ Full error:', error);
    console.error('❌ ==========================================');
    console.error('💡 Please check:');
    console.error('   1. Database credentials in .env file');
    console.error('   2. Database server is running');
    console.error('   3. Network connectivity to database');
    console.error('   4. SSL configuration (if using cloud database)');
    console.error('❌ ==========================================');
    process.exit(1);
  }
}

// Routes
// Log before mounting auth routes
console.log('🔓 Mounting auth routes at /api/auth');
console.log('🔓 Register route should be PUBLIC (no auth)');
app.use('/api/auth', authRoutes);
console.log('🔓 Auth routes mounted successfully');
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/accounting', accountingRoutes);
console.log('✅ Accounting routes registered at /api/accounting');

// Log registered routes
console.log('✅ Routes registered:');
console.log('   - /api/auth/*');
console.log('   - /api/employees/*');
console.log('   - /api/attendance/*');
console.log('   - /api/leaves/*');
console.log('   - /api/payroll/*');
console.log('   - /api/reports/*');
console.log('   - /api/settings/*');
console.log('   - /api/recruitment/*');
console.log('   - /api/dashboard/*');
console.log('   - /api/performance/*');
console.log('   - /api/accounting/*');
console.log('✅ CORS enabled for:');
allowedOrigins.forEach(origin => console.log(`   - ${origin}`));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test public endpoint to verify unauthenticated access works
app.get('/api/test-public', (req, res) => {
  console.log('✅ Public test endpoint accessed - no auth required');
  res.json({ 
    message: 'This is a public endpoint - no auth required',
    timestamp: new Date().toISOString(),
    serverTime: new Date().toLocaleString()
  });
});

// Version endpoint to verify deployed code
app.get('/api/version', (req, res) => {
  res.json({ 
    version: '3.0.0-admin-only-registration',
    message: 'User registration is now restricted to administrators',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'not set',
    database: {
      host: process.env.DB_HOST || 'not set',
      database: process.env.DB_NAME || 'not set',
      hasPassword: !!process.env.DB_PASSWORD
    },
    routes: {
      register: 'PROTECTED - requires admin/hr_executive token',
      login: 'PUBLIC - no auth required',
      registerFirst: 'PUBLIC - first admin setup only',
      users: 'PROTECTED - requires admin/hr_executive token'
    },
    publicRoutes: [
      '/api/auth/login',
      '/api/auth/register-first',
      '/api/health',
      '/api/test-public',
      '/api/version'
    ],
    features: {
      userRegistration: 'Admin-only',
      userManagement: 'Available in Settings page for admins'
    }
  });
});


// 404 handler for API routes (must be after all route registrations)
app.use('/api/*', (req, res) => {
  console.log(`❌ 404 - API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'POST /api/auth/login',
      'POST /api/auth/register',
      'POST /api/auth/register-first',
      'GET /api/health',
      'GET /api/dashboard/stats',
      'GET /api/accounting?month=X&year=Y',
      'PUT /api/accounting/:id'
    ]
  });
});

// General 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
startServer().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  });

  // Handle port already in use error
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.error(`💡 Try: kill -9 $(lsof -ti:${PORT})`);
      console.error(`💡 Or change PORT in .env file`);
      process.exit(1);
    } else {
      throw error;
    }
  });
});

