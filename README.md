# VAAL HRMS - Human Resource Management System

A comprehensive HRMS solution built with MERN stack, featuring face recognition attendance, automated workflows, and mobile app support.

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose
- JWT Authentication
- Python Flask service for face recognition (InsightFace)

**Frontend:**
- React 18 with Vite
- React Router DOM for routing
- TanStack React Query for data fetching
- Tailwind CSS for styling
- Capacitor for mobile app (Android/iOS)

**Face Recognition:**
- Python Flask microservice
- InsightFace (buffalo_l model) with 512-dimensional ArcFace embeddings
- Real-time face detection and matching

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Python 3.8+ (for face recognition service)
- npm or yarn package manager

## 🚀 Setup Instructions

### 1. Clone Repository
```bash
git clone <repository-url>
cd vaalhr-main
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (root, backend, frontend)
npm run install-all
```

### 3. Environment Configuration

#### Backend Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vaalhr
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
NODE_ENV=development
PYTHON_FACE_SERVICE_URL=http://localhost:5001
```

#### Frontend Environment Variables
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Setup Python Face Recognition Service

```bash
cd backend/python-face-service
pip install -r requirements.txt
```

The InsightFace model will be automatically downloaded on first run.

### 5. Start Services

#### Development Mode (All Services)
```bash
# From root directory - starts both backend and frontend
npm run dev
```

#### Individual Services

**Backend Only:**
```bash
npm run server
# OR
cd backend && npm run dev
```

**Frontend Only:**
```bash
npm run client
# OR
cd frontend && npm run dev
```

**Python Face Service:**
```bash
cd backend/python-face-service
python app.py
# Runs on port 5001 by default
```

### 6. Database Setup

**Seed Initial Data:**
```bash
cd backend

# Seed roles and permissions
npm run seed-roles

# Seed demo data
npm run seed-demo

# Seed NABH compliance data (if applicable)
npm run seed-nabh

# Test database connection
npm run test-db
```

## 🔄 Complete Application Flow

### 1. Authentication Flow

```
User Login
    ↓
POST /api/auth/login
    ↓
Validate Email & Password
    ↓
Generate JWT Token & Refresh Token
    ↓
Store Tokens in LocalStorage (Frontend)
    ↓
Set User Context (AuthContext)
    ↓
Redirect to Dashboard
    ↓
Auto-refresh token every 50 minutes
```

**Protected Routes:**
- All routes except `/login`, `/forgot-password`, `/reset-password` require authentication
- Role-based access control (Admin, HR, Employee)
- Token validation via `auth.middleware.js`

### 2. Employee Onboarding Flow

```
HR/Admin Creates Employee
    ↓
POST /api/employees
    ↓
Validate Employee Data
    ↓
Create User Account (if new)
    ↓
Create Employee Record
    ↓
Assign Department, Designation, Shift
    ↓
Upload Profile Photo
    ↓
Generate Face Descriptor (Optional)
    ↓
Assign Face Descriptor to Employee
    ↓
Employee Record Created
    ↓
Employee Receives Credentials (Email/SMS)
```

### 3. Face Recognition Setup Flow

```
Employee Profile Photo Upload
    ↓
POST /api/employees/:id/face-descriptor
    ↓
Extract Image (Base64/URL)
    ↓
Send to Python Face Service
    ↓
POST /generate-descriptor (Python Service)
    ↓
InsightFace Model Detects Face
    ↓
Generate 512-dimensional ArcFace Embedding
    ↓
Validate Face Size (min 100x100px)
    ↓
Return Face Descriptor
    ↓
Store in Employee.faceDescriptor Field
    ↓
Set employee.faceEligible = true
```

### 4. Manual Attendance Flow

```
Employee Navigates to Attendance Page
    ↓
Click Punch In/Out Button
    ↓
POST /api/attendance/punch
    ↓
Validate Employee & Shift
    ↓
Check Duplicate Punch (within cooldown period)
    ↓
Capture Camera Snapshot (if cameraId provided)
    ↓
Send Image to Python Face Service
    ↓
POST /detect-faces (Python Service)
    ↓
Extract Face Embedding from Snapshot
    ↓
Compare with Employee's Face Descriptor
    ↓
POST /compare-faces (Python Service)
    ↓
Calculate Cosine Similarity
    ↓
Match if Similarity >= 0.40 (Threshold)
    ↓
Record Attendance with Face Match Result
    ↓
Create Face Attendance Log Entry
    ↓
Return Success Response
    ↓
Display Confirmation to Employee
```

### 5. Auto Punch-In Flow (Camera-Based)

```
Camera Monitoring Service Running
    ↓
Capture Frame from Camera Stream
    ↓
POST /api/auto-punch-in/process
    ↓
Send Image Buffer to Python Service
    ↓
Detect All Faces in Frame
    ↓
Extract Face Embeddings for Each Face
    ↓
Query Employees Assigned to Camera
    ↓
Filter Face-Eligible Employees
    ↓
Compare Each Detected Face with All Employees
    ↓
For Each Match (Similarity >= 0.40):
    ├─ Check if Already Punched In Today
    ├─ Check Cooldown Period
    ├─ Validate Shift Timing
    ├─ Create Punch In Record
    ├─ Create Face Attendance Log
    └─ Return Success
    ↓
Log Results for Monitoring
```

### 6. Leave Application Flow

```
Employee Applies for Leave
    ↓
POST /api/leaves
    ↓
Validate Leave Balance
    ↓
Check Overlapping Leave Requests
    ↓
Create Leave Request (Status: Pending)
    ↓
Notify Reporting Manager/HR
    ↓
Manager Reviews Request
    ↓
PUT /api/leaves/:id/approve or /reject
    ↓
Update Leave Balance
    ↓
Send Notification to Employee
    ↓
If Approved: Update Attendance Calendar
```

### 7. Payroll Processing Flow

```
HR Initiates Payroll Run
    ↓
POST /api/payroll/process
    ↓
Calculate Period (Monthly/Weekly)
    ↓
For Each Employee:
    ├─ Fetch Attendance Records
    ├─ Calculate Working Days
    ├─ Calculate Overtime Hours
    ├─ Apply Leave Deductions
    ├─ Calculate Gross Salary
    ├─ Apply Deductions (Tax, PF, etc.)
    ├─ Calculate Net Salary
    └─ Generate Pay Slip
    ↓
Generate Payroll Report
    ↓
Send Payslips to Employees
```

### 8. Exit Processing Flow

```
Employee Submits Resignation
    ↓
POST /api/resignations
    ↓
HR Reviews Resignation
    ↓
Initiate Exit Process
    ↓
POST /api/exit/initiate
    ↓
Generate Exit Checklist
    ├─ Asset Return
    ├─ Document Clearance
    ├─ Final Settlement
    └─ Knowledge Transfer
    ↓
Calculate Final Settlement
    ├─ Outstanding Salary
    ├─ Leave Encashment
    ├─ Notice Period Deductions
    └─ Other Adjustments
    ↓
Generate Full & Final Settlement Report
    ↓
Approve & Process Payment
    ↓
Update Employee Status to Inactive
```

## 📱 Mobile App Flow

```
Capacitor Build Process
    ↓
npm run build (Frontend)
    ↓
npx cap sync (Android/iOS)
    ↓
npx cap open android/ios
    ↓
Native App with WebView
    ↓
Same API Endpoints as Web
    ↓
Camera Access via Capacitor Camera Plugin
    ↓
Face Recognition Works Same as Web
```

## 🔌 API Endpoints Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `POST /api/employees/:id/face-descriptor` - Generate face descriptor

### Attendance
- `POST /api/attendance/punch` - Manual punch in/out
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/dashboard` - Attendance dashboard data
- `POST /api/auto-punch-in/process` - Auto punch-in from camera

### Face Recognition (Python Service)
- `GET /health` - Service health check
- `POST /generate-descriptor` - Generate face embedding
- `POST /detect-faces` - Detect faces in image
- `POST /compare-faces` - Compare two face descriptors

### Leaves
- `GET /api/leaves` - List leave requests
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/:id/approve` - Approve leave
- `PUT /api/leaves/:id/reject` - Reject leave

### Payroll
- `GET /api/payroll` - Get payroll records
- `POST /api/payroll/process` - Process payroll
- `GET /api/payroll/reports` - Generate payroll reports

### Other Modules
- Departments, Designations, Shifts, Assets, Expenses, Grievances, Recruitment, Training, Performance Reviews, etc.

## 🎯 Key Features

### Core HR Functions
- ✅ Employee Management (CRUD operations)
- ✅ Department & Designation Management
- ✅ Shift Management & Assignments
- ✅ Attendance Tracking (Manual & Automated)
- ✅ Leave Management & Approval Workflows
- ✅ Payroll Processing & Reports
- ✅ Asset Management
- ✅ Expense Management

### Face Recognition Attendance
- ✅ Profile Photo to Face Descriptor Conversion
- ✅ Manual Face Verification on Punch
- ✅ Camera-Based Auto Punch-In
- ✅ Real-time Face Detection & Matching
- ✅ Face Attendance Logs & Audit Trail
- ✅ Multi-Camera Support

### Employee Self-Service (ESS)
- ✅ Employee Dashboard
- ✅ Leave Application
- ✅ Attendance Viewing
- ✅ Payslip Download
- ✅ Document Management
- ✅ Profile Management

### Advanced Features
- ✅ Performance Management (Goals, Reviews, Assessments)
- ✅ Recruitment & Onboarding
- ✅ Training & Competency Management
- ✅ Exit Processing & Final Settlement
- ✅ Geo-fencing for Location-Based Attendance
- ✅ Analytics & Reporting Dashboard
- ✅ Audit Trail & Compliance (NABH)
- ✅ Privileging Management
- ✅ Occupational Health Records

## 🗄️ Database Models

### Core Models
- User, Employee, Department, Designation, Branch, Shift
- Attendance, FaceAttendanceLog, Leave, Payroll
- Role, Permission, AuditLog
- Asset, Expense, Document, Grievance
- Recruitment, Onboarding, Resignation, ExitProcessing

### Face Recognition Models
- Employee.faceDescriptor (512-dimensional array)
- FaceAttendanceLog (face match results, verification status)
- Camera, CameraAssignment, CameraMonitoring

## 🔒 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Request rate limiting
- CORS configuration
- Input validation and sanitization
- Audit logging for sensitive operations

## 🧪 Testing & Scripts

```bash
# Database
npm run test-db          # Test MongoDB connection
npm run check-user       # Check user in database

# Data Seeding
npm run seed             # Seed initial data
npm run seed-demo        # Seed demo data
npm run seed-roles       # Seed roles & permissions
npm run reset-db         # Reset database (⚠️ Destructive)

# Utilities
npm run free-port        # Check/free port 5000
npm run start-safe       # Start with port check
```

## 📦 Build & Deployment

### Frontend Build
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Mobile App Build
```bash
cd frontend
npm run build
npx cap sync
npx cap open android  # Opens Android Studio
npx cap open ios      # Opens Xcode
```

### Production Deployment
1. Set `NODE_ENV=production` in environment variables
2. Update `MONGODB_URI` to production database
3. Update `VITE_API_URL` in frontend to production API
4. Build frontend: `npm run build`
5. Serve static files from `dist/` folder
6. Start backend: `npm start` (uses PM2/forever in production)

## 🐛 Troubleshooting

### Common Issues


**Port Already in Use:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Use safe start
npm run start-safe
```

**Python Face Service Not Starting:**
- Check Python version (3.8+)
- Install dependencies: `pip install -r requirements.txt`
- Check if port 5001 is available
- Verify InsightFace model download

**MongoDB Connection Error:**
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env`
- Test connection: `npm run test-db`

**Face Recognition Failing:**
- Ensure employee has `faceDescriptor` field
- Check image quality (min 100x100px face)
- Verify Python service is running on port 5001
- Check `PYTHON_FACE_SERVICE_URL` in backend `.env`

## 📝 Development Guidelines

### Code Structure
- Backend: MVC pattern (Models, Views/Controllers, Routes)
- Frontend: Component-based architecture with contexts
- Services: Business logic separation
- Middleware: Authentication, validation, error handling

### Best Practices
- Use environment variables for configuration
- Implement proper error handling
- Validate all inputs
- Use async/await for asynchronous operations
- Follow RESTful API conventions
- Maintain code documentation

## 📄 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Built with ❤️ using MERN Stack**
