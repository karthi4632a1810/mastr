import express from 'express';
import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticate } from './middleware/auth.middleware.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://vaalboss.onrender.com',
      'https://vaalhr.onrender.com', // Keep old URL for backward compatibility
      process.env.FRONTEND_URL,
      process.env.VITE_API_URL?.replace('/api', ''),
    ].filter(Boolean); // Remove undefined values

    // Allow all origins in development, or check against allowed list
    if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, allow specific origins
      if (allowedOrigins.some(allowed => origin.includes(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import departmentRoutes from './routes/department.routes.js';
import designationRoutes from './routes/designation.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import shiftRoutes from './routes/shift.routes.js';
import shiftAssignmentRoutes from './routes/shiftAssignment.routes.js';
import shiftRotationRoutes from './routes/shiftRotation.routes.js';
import shiftChangeRoutes from './routes/shiftChange.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import assetRoutes from './routes/asset.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import grievanceRoutes from './routes/grievance.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import recruitmentRoutes from './routes/recruitment.routes.js';
import documentRoutes from './routes/document.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import companyRoutes from './routes/company.routes.js';
import auditRoutes from './routes/audit.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import geoFenceRoutes from './routes/geoFence.routes.js';
import essRoutes from './routes/ess.routes.js';
import performanceCycleRoutes from './routes/performanceCycle.routes.js';
import goalRoutes from './routes/goal.routes.js';
import selfAssessmentRoutes from './routes/selfAssessment.routes.js';
import performanceReviewRoutes from './routes/performanceReview.routes.js';
import resignationRoutes from './routes/resignation.routes.js';
import exitProcessingRoutes from './routes/exitProcessing.routes.js';
import finalSettlementRoutes from './routes/finalSettlement.routes.js';
import attendanceModeConfigRoutes from './routes/attendanceModeConfig.routes.js';
import cameraRoutes from './routes/camera.routes.js';
import cameraAssignmentRoutes from './routes/cameraAssignment.routes.js';
import cameraMonitoringRoutes from './routes/cameraMonitoring.routes.js';
import autoPunchInRoutes from './routes/autoPunchIn.routes.js';
import faceAttendanceLogRoutes from './routes/faceAttendanceLog.routes.js';
import trainingRoutes from './routes/training.routes.js';
import occupationalHealthRoutes from './routes/occupationalHealth.routes.js';
import privilegingRoutes from './routes/privileging.routes.js';
import { getOrganizationTree } from './controllers/organization.controller.js';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/shift-assignments', shiftAssignmentRoutes);
app.use('/api/shift-rotations', shiftRotationRoutes);
app.use('/api/shift-changes', shiftChangeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/geofences', geoFenceRoutes);
app.use('/api/ess', essRoutes);
app.use('/api/performance-cycles', performanceCycleRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/self-assessments', selfAssessmentRoutes);
app.use('/api/performance-reviews', performanceReviewRoutes);
app.use('/api/resignations', resignationRoutes);
app.use('/api/exit', exitProcessingRoutes);
app.use('/api/settlements', finalSettlementRoutes);
app.use('/api/attendance-modes', attendanceModeConfigRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/camera-assignments', cameraAssignmentRoutes);
app.use('/api/camera-monitoring', cameraMonitoringRoutes);
app.use('/api/auto-punch-in', autoPunchInRoutes);
app.use('/api/face-attendance-logs', faceAttendanceLogRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/occupational-health', occupationalHealthRoutes);
app.use('/api/privileging', privilegingRoutes);

// Organization tree endpoint
app.get('/api/organization/tree', authenticate, getOrganizationTree);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HRMS API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const MONGODB_RETRY_ATTEMPTS = 3;
const MONGODB_RETRY_DELAY_MS = 1000;

function isSrvDnsError(error) {
  const code = error?.code ?? '';
  const syscall = error?.syscall ?? '';
  return (code === 'ECONNREFUSED' && syscall === 'querySrv') || /querySrv|ENOTFOUND|ESERVFAIL/.test(String(code));
}

function isSrvUri(uri) {
  return typeof uri === 'string' && uri.trim().toLowerCase().startsWith('mongodb+srv://');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectMongo(uri) {
  await mongoose.connect(uri);
}

const PUBLIC_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];

function usePublicDnsForSrv() {
  try {
    dns.setServers(PUBLIC_DNS_SERVERS);
  } catch (_) {
    // ignore if setServers fails
  }
}

async function startServer() {
  const uri = process.env.MONGODB_URI ?? process.env.MONGODB_URI_DIRECT;
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.error('❌ MongoDB connection error: MONGODB_URI is not set in .env');
    process.exit(1);
  }

  const urisToTry = [uri.trim()];
  const directUri = process.env.MONGODB_URI_DIRECT?.trim();
  if (directUri && uri.trim() !== directUri && !isSrvUri(directUri)) {
    urisToTry.push(directUri);
  }

  let lastError;
  let usedPublicDns = false;
  for (let uriIndex = 0; uriIndex < urisToTry.length; uriIndex++) {
    const tryUri = urisToTry[uriIndex];
    if (isSrvUri(tryUri) && !usedPublicDns) {
      usePublicDnsForSrv();
      usedPublicDns = true;
      console.warn('⚠️ Using public DNS (8.8.8.8, 1.1.1.1) for MongoDB SRV lookup...');
    }
    for (let attempt = 1; attempt <= MONGODB_RETRY_ATTEMPTS; attempt++) {
      try {
        await connectMongo(tryUri);
        console.log('✅ MongoDB connected successfully');
        const PORT = Number(process.env.PORT) || 5000;
        const server = app.listen(PORT, () => {
          console.log(`🚀 Server running on port ${PORT}`);
        });
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use!`);
            console.error(`💡 Please stop the process using port ${PORT} or use a different port.`);
            console.error(`💡 To find and kill the process: netstat -ano | findstr :${PORT}`);
            process.exit(1);
          } else {
            console.error('❌ Server error:', error);
            process.exit(1);
          }
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < MONGODB_RETRY_ATTEMPTS) {
          const waitMs = MONGODB_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`⚠️ MongoDB connection attempt ${attempt}/${MONGODB_RETRY_ATTEMPTS} failed, retrying in ${waitMs}ms...`);
          await delay(waitMs);
        }
      }
    }
    if (uriIndex === 0 && urisToTry.length > 1 && isSrvDnsError(lastError)) {
      console.warn('⚠️ SRV connection failed, trying direct connection string...');
    }
  }

  console.error('❌ MongoDB connection error:', lastError?.message ?? lastError);
  if (lastError && isSrvDnsError(lastError)) {
    console.error('💡 Why: Your network/DNS cannot resolve MongoDB Atlas SRV (querySrv).');
    console.error('   Fix: Use a DIRECT connection string (starts with mongodb:// not mongodb+srv://).');
    console.error('   In Atlas: Connect → your cluster → Connect your application → open "Driver" → set connection type to "Direct" and copy the URI into MONGODB_URI in backend/.env');
    if (isSrvUri(process.env.MONGODB_URI) && isSrvUri(process.env.MONGODB_URI_DIRECT)) {
      console.error('   Note: MONGODB_URI_DIRECT must be a direct URI (mongodb://...), not mongodb+srv://.');
    }
  }
  process.exit(1);
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default app;
