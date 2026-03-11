import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingFallback from './components/LoadingFallback'

// Lazy load pages for code splitting and lighter initial bundle
const Login = lazy(() => import('./pages/auth/Login'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
// Lazy load all route components for better code splitting
const Employees = lazy(() => import('./pages/employees/Employees'))
const EmployeeForm = lazy(() => import('./pages/employees/EmployeeForm'))
const EmployeeProfile = lazy(() => import('./pages/employees/EmployeeProfile'))
const MyProfile = lazy(() => import('./pages/employees/MyProfile'))
const ChangeRequests = lazy(() => import('./pages/employees/ChangeRequests'))
const Attendance = lazy(() => import('./pages/attendance/Attendance'))
const AttendanceDashboard = lazy(() => import('./pages/attendance/AttendanceDashboard'))
const FaceAttendanceLogs = lazy(() => import('./pages/attendance/FaceAttendanceLogs'))
const Roster = lazy(() => import('./pages/attendance/Roster'))
const MyRoster = lazy(() => import('./pages/attendance/MyRoster'))
const ShiftAnalytics = lazy(() => import('./pages/analytics/ShiftAnalytics'))
const Leaves = lazy(() => import('./pages/leaves/Leaves'))
const LeaveTypesAdmin = lazy(() => import('./pages/leaves/LeaveTypesAdmin'))
const LeaveApprovalDashboard = lazy(() => import('./pages/leaves/LeaveApprovalDashboard'))
const LeaveBalanceDashboard = lazy(() => import('./pages/leaves/LeaveBalanceDashboard'))
const Payroll = lazy(() => import('./pages/payroll/Payroll'))
const SalaryStructures = lazy(() => import('./pages/payroll/SalaryStructures'))
const EmployeeSalary = lazy(() => import('./pages/payroll/EmployeeSalary'))
const PayrollDashboard = lazy(() => import('./pages/payroll/PayrollDashboard'))
const PayrollReports = lazy(() => import('./pages/payroll/PayrollReports'))
const FullFinalSettlement = lazy(() => import('./pages/payroll/FullFinalSettlement'))
const Settings = lazy(() => import('./pages/settings/Settings'))
const GeoFences = lazy(() => import('./pages/geofences/GeoFences'))
const ESSDashboard = lazy(() => import('./pages/ess/ESSDashboard'))
const MyRequests = lazy(() => import('./pages/ess/MyRequests'))
const Assets = lazy(() => import('./pages/assets/Assets'))
const MyAssets = lazy(() => import('./pages/assets/MyAssets'))
const Expenses = lazy(() => import('./pages/expenses/Expenses'))
const ExpenseApprovals = lazy(() => import('./pages/expenses/ExpenseApprovals'))
const JobOpenings = lazy(() => import('./pages/recruitment/JobOpenings'))
const JobOpeningForm = lazy(() => import('./pages/recruitment/JobOpeningForm'))
const JobOpeningDetail = lazy(() => import('./pages/recruitment/JobOpeningDetail'))
const Candidates = lazy(() => import('./pages/recruitment/Candidates'))
const CandidateForm = lazy(() => import('./pages/recruitment/CandidateForm'))
const CandidateDetail = lazy(() => import('./pages/recruitment/CandidateDetail'))
const CandidateAgingReport = lazy(() => import('./pages/recruitment/CandidateAgingReport'))
const OnboardingTemplates = lazy(() => import('./pages/onboarding/OnboardingTemplates'))
const OnboardingTemplateForm = lazy(() => import('./pages/onboarding/OnboardingTemplateForm'))
const OnboardingTemplateDetail = lazy(() => import('./pages/onboarding/OnboardingTemplateDetail'))
const StartOnboarding = lazy(() => import('./pages/onboarding/StartOnboarding'))
const OnboardingInstances = lazy(() => import('./pages/onboarding/OnboardingInstances'))
const EmployeeOnboardingTasks = lazy(() => import('./pages/onboarding/EmployeeOnboardingTasks'))
const HROnboardingDashboard = lazy(() => import('./pages/onboarding/HROnboardingDashboard'))
const PerformanceCycles = lazy(() => import('./pages/performance/PerformanceCycles'))
const PerformanceCycleForm = lazy(() => import('./pages/performance/PerformanceCycleForm'))
const PerformanceCycleDetail = lazy(() => import('./pages/performance/PerformanceCycleDetail'))
const Goals = lazy(() => import('./pages/performance/Goals'))
const GoalForm = lazy(() => import('./pages/performance/GoalForm'))
const GoalDetail = lazy(() => import('./pages/performance/GoalDetail'))
const SelfAssessmentForm = lazy(() => import('./pages/performance/SelfAssessmentForm'))
const PerformanceReviews = lazy(() => import('./pages/performance/PerformanceReviews'))
const PerformanceReviewDetail = lazy(() => import('./pages/performance/PerformanceReviewDetail'))
const MyPerformanceReview = lazy(() => import('./pages/performance/MyPerformanceReview'))
const ResignationForm = lazy(() => import('./pages/resignation/ResignationForm'))
const MyResignation = lazy(() => import('./pages/resignation/MyResignation'))
const ResignationReview = lazy(() => import('./pages/resignation/ResignationReview'))
const Grievances = lazy(() => import('./pages/grievance/Grievances'))
const Shifts = lazy(() => import('./pages/shifts/Shifts'))
const ShiftChanges = lazy(() => import('./pages/shifts/ShiftChanges'))
const ShiftRotations = lazy(() => import('./pages/shifts/ShiftRotations'))
const ExitProcessing = lazy(() => import('./pages/exit/ExitProcessing'))
const AuditLogs = lazy(() => import('./pages/audit/AuditLogs'))
const Documents = lazy(() => import('./pages/documents/Documents'))
const Roles = lazy(() => import('./pages/roles/Roles'))
const Permissions = lazy(() => import('./pages/permissions/Permissions'))
const CompanySettings = lazy(() => import('./pages/company/CompanySettings'))
const AttendanceModeConfig = lazy(() => import('./pages/settings/AttendanceModeConfig'))
const Cameras = lazy(() => import('./pages/settings/Cameras'))
const CameraAssignments = lazy(() => import('./pages/settings/CameraAssignments'))
const RealTimeAttendance = lazy(() => import('./pages/attendance/RealTimeAttendance'))
const CameraPreviewPage = lazy(() => import('./pages/attendance/CameraPreviewPage'))
// NABH Compliance Modules
const TrainingDashboard = lazy(() => import('./pages/training/TrainingDashboard'))
const TrainingPrograms = lazy(() => import('./pages/training/TrainingPrograms'))
const TrainingRecords = lazy(() => import('./pages/training/TrainingRecords'))
const CompetencyMatrices = lazy(() => import('./pages/training/CompetencyMatrices'))
const CompetencyAssessments = lazy(() => import('./pages/training/CompetencyAssessments'))
const OccupationalHealthDashboard = lazy(() => import('./pages/occupationalHealth/OccupationalHealthDashboard'))
const ImmunizationRecords = lazy(() => import('./pages/occupationalHealth/ImmunizationRecords'))
const HealthCheckups = lazy(() => import('./pages/occupationalHealth/HealthCheckups'))
const OccupationalExposures = lazy(() => import('./pages/occupationalHealth/OccupationalExposures'))
const IncidentReports = lazy(() => import('./pages/occupationalHealth/IncidentReports'))
const PrivilegingDashboard = lazy(() => import('./pages/privileging/PrivilegingDashboard'))
const PrivilegeCategories = lazy(() => import('./pages/privileging/PrivilegeCategories'))
const PrivilegeCommittees = lazy(() => import('./pages/privileging/PrivilegeCommittees'))
const PrivilegeRequests = lazy(() => import('./pages/privileging/PrivilegeRequests'))
const DoctorPrivileges = lazy(() => import('./pages/privileging/DoctorPrivileges'))

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={!user ? <ResetPassword /> : <Navigate to="/dashboard" />} />
      
      {/* Public routes - require authentication */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ess-dashboard" element={<ProtectedRoute allowedRoles={['employee']}><ESSDashboard /></ProtectedRoute>} />
        <Route path="/my-requests" element={<ProtectedRoute allowedRoles={['employee']}><MyRequests /></ProtectedRoute>} />
        <Route path="/my-assets" element={<ProtectedRoute allowedRoles={['employee']}><MyAssets /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute allowedRoles={['employee']}><Expenses /></ProtectedRoute>} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/change-requests" element={<ChangeRequests />} />
        <Route path="/grievances" element={<Grievances />} />
        <Route path="/shifts/change-requests" element={<ShiftChanges />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={['employee']}><Attendance /></ProtectedRoute>} />
        <Route path="/face-attendance-logs" element={<FaceAttendanceLogs />} />
        <Route path="/my-roster" element={<ProtectedRoute allowedRoles={['employee']}><MyRoster /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute allowedRoles={['employee']}><Leaves /></ProtectedRoute>} />
        <Route path="/leave-balance" element={<ProtectedRoute allowedRoles={['employee']}><LeaveBalanceDashboard /></ProtectedRoute>} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Route>

      {/* Admin/HR only routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Layout /></ProtectedRoute>}>
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/new" element={<EmployeeForm />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm />} />
        <Route path="/employees/:id" element={<EmployeeProfile />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/expense-approvals" element={<ExpenseApprovals />} />
        <Route path="/leave-approvals" element={<ProtectedRoute allowedRoles={['hr']}><LeaveApprovalDashboard /></ProtectedRoute>} />
        <Route path="/leave-types" element={<LeaveTypesAdmin />} />
        <Route path="/attendance-dashboard" element={<AttendanceDashboard />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/analytics" element={<ShiftAnalytics />} />
        <Route path="/salary-structures" element={<SalaryStructures />} />
        <Route path="/employee-salary" element={<EmployeeSalary />} />
        <Route path="/payroll-dashboard" element={<PayrollDashboard />} />
        <Route path="/payroll-reports" element={<PayrollReports />} />
        <Route path="/fnf-settlement" element={<FullFinalSettlement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/geofences" element={<GeoFences />} />
        <Route path="/cameras" element={<Cameras />} />
        <Route path="/cameras/:id/preview" element={<CameraPreviewPage />} />
        <Route path="/camera-assignments" element={<CameraAssignments />} />
        <Route path="/real-time-attendance" element={<RealTimeAttendance />} />
        <Route path="/recruitment/jobs" element={<JobOpenings />} />
        <Route path="/recruitment/jobs/new" element={<JobOpeningForm />} />
        <Route path="/recruitment/jobs/:id" element={<JobOpeningDetail />} />
        <Route path="/recruitment/jobs/:id/edit" element={<JobOpeningForm />} />
        <Route path="/recruitment/jobs/:jobOpeningId/candidates/new" element={<CandidateForm />} />
        <Route path="/recruitment/candidates" element={<Candidates />} />
        <Route path="/recruitment/candidates/new" element={<CandidateForm />} />
        <Route path="/recruitment/candidates/:id" element={<CandidateDetail />} />
        <Route path="/recruitment/candidates/:id/edit" element={<CandidateForm />} />
        <Route path="/recruitment/candidates/aging-report" element={<CandidateAgingReport />} />
        <Route path="/onboarding/templates" element={<OnboardingTemplates />} />
        <Route path="/onboarding/templates/new" element={<OnboardingTemplateForm />} />
        <Route path="/onboarding/templates/:id" element={<OnboardingTemplateDetail />} />
        <Route path="/onboarding/templates/:id/edit" element={<OnboardingTemplateForm />} />
        <Route path="/onboarding/start" element={<StartOnboarding />} />
        <Route path="/onboarding/instances" element={<OnboardingInstances />} />
        <Route path="/onboarding/dashboard" element={<HROnboardingDashboard />} />
        <Route path="/performance/cycles" element={<PerformanceCycles />} />
        <Route path="/performance/cycles/new" element={<PerformanceCycleForm />} />
        <Route path="/performance/cycles/:id" element={<PerformanceCycleDetail />} />
        <Route path="/performance/cycles/:id/edit" element={<PerformanceCycleForm />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/shifts/rotations" element={<ShiftRotations />} />
        <Route path="/exit/processing" element={<ExitProcessing />} />
        <Route path="/resignation/review" element={<ResignationReview />} />
        <Route path="/resignation/review/:id" element={<ResignationReview />} />
      </Route>

      {/* Admin only routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/company" element={<CompanySettings />} />
        <Route path="/attendance-modes" element={<AttendanceModeConfig />} />
      </Route>

      {/* Employee self-assessment and review */}
      {/* Performance - Goals (accessible to all authenticated users) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/performance/goals" element={<Goals />} />
        <Route path="/performance/goals/new" element={<GoalForm />} />
        <Route path="/performance/goals/:id" element={<GoalDetail />} />
        <Route path="/performance/goals/:id/edit" element={<GoalForm />} />
      </Route>

      {/* Performance - Self Assessment */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/performance/self-assessment" element={<SelfAssessmentForm />} />
        <Route path="/performance/self-assessment/:id" element={<SelfAssessmentForm />} />
        <Route path="/performance/my-review" element={<MyPerformanceReview />} />
      </Route>

      {/* Employee resignation */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/resignation/submit" element={<ResignationForm />} />
        <Route path="/resignation/my-resignation" element={<MyResignation />} />
      </Route>

      {/* HR Performance Reviews */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/performance/reviews" element={<PerformanceReviews />} />
        <Route path="/performance/reviews/:id" element={<PerformanceReviewDetail />} />
      </Route>

      {/* Employee onboarding tasks */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/onboarding" element={<EmployeeOnboardingTasks />} />
      </Route>

      {/* NABH Compliance - Training & Competency (Employee - View Own) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/training/dashboard" element={<TrainingDashboard />} />
        <Route path="/training/records" element={<TrainingRecords />} />
      </Route>

      {/* NABH Compliance - Occupational Health (Employee - View Own) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/occupational-health/dashboard" element={<OccupationalHealthDashboard />} />
        <Route path="/occupational-health/immunizations" element={<ImmunizationRecords />} />
        <Route path="/occupational-health/checkups" element={<HealthCheckups />} />
        <Route path="/occupational-health/exposures" element={<OccupationalExposures />} />
        <Route path="/occupational-health/incidents" element={<IncidentReports />} />
      </Route>

      {/* NABH Compliance - Privileging (Employee - View Own) */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/privileging/dashboard" element={<PrivilegingDashboard />} />
        <Route path="/privileging/requests" element={<PrivilegeRequests />} />
        <Route path="/privileging/privileges" element={<DoctorPrivileges />} />
      </Route>

      {/* NABH Compliance - Training & Competency (HR/Admin - Manage All) */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Layout /></ProtectedRoute>}>
        <Route path="/training/programs" element={<TrainingPrograms />} />
        <Route path="/training/competency-matrices" element={<CompetencyMatrices />} />
        <Route path="/training/competency-assessments" element={<CompetencyAssessments />} />
      </Route>

      {/* NABH Compliance - Privileging (HR/Admin - Manage All) */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'hr']}><Layout /></ProtectedRoute>}>
        <Route path="/privileging/categories" element={<PrivilegeCategories />} />
        <Route path="/privileging/committees" element={<PrivilegeCommittees />} />
      </Route>
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
