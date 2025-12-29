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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
// CORS configuration - allow frontend from Vercel and local development
const allowedOrigins = [
  'https://kiwi-shraddha.vercel.app',
  'https://kiwi-shraddha.vercel.app/',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
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
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Initialize database tables
    await initializeDatabase();
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.error('Please check your .env file and ensure PostgreSQL is running');
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/performance', performanceRoutes);

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
console.log('✅ CORS enabled for:');
allowedOrigins.forEach(origin => console.log(`   - ${origin}`));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
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
      'GET /api/dashboard/stats'
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

