import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import NotificationCenter from './NotificationCenter'
import Logo from './Logo'
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  FileEdit,
  MapPin,
  Sparkles,
  FileText,
  Package,
  Briefcase,
  Receipt,
  FileCheck2,
  UserCheck,
  TrendingUp,
  Target,
  Star,
  CheckCircle,
  AlertCircle,
  RotateCw,
  Activity,
  Shield,
  Key,
  Building2,
  Camera,
  UserPlus,
  Monitor,
  GraduationCap,
  Heart,
  Stethoscope,
  ClipboardCheck
} from 'lucide-react'
import { useState, useMemo } from 'react'

const Layout = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch attendance mode configuration summary
  const { data: attendanceModeSummary } = useQuery({
    queryKey: ['attendance-mode-summary'],
    queryFn: async () => {
      const response = await api.get('/attendance-modes/summary')
      return response.data.data || null
    },
    enabled: user?.role === 'hr' || user?.role === 'admin' || user?.role === 'employee',
  })

  // Check if face recognition is enabled
  const isFaceRecognitionEnabled = useMemo(() => {
    if (!attendanceModeSummary) return false
    return (
      attendanceModeSummary.global?.modes?.faceRecognition?.enabled ||
      attendanceModeSummary.global?.modes?.hybrid?.enabled ||
      attendanceModeSummary.byDepartment?.some(c => c.modes?.faceRecognition?.enabled || c.modes?.hybrid?.enabled) ||
      attendanceModeSummary.byRole?.some(c => c.modes?.faceRecognition?.enabled || c.modes?.hybrid?.enabled) ||
      attendanceModeSummary.byLocation?.some(c => c.modes?.faceRecognition?.enabled || c.modes?.hybrid?.enabled)
    )
  }, [attendanceModeSummary])

  // Check if geo-fence is enabled
  const isGeoFenceEnabled = useMemo(() => {
    if (!attendanceModeSummary) return false
    return (
      attendanceModeSummary.global?.modes?.geoFence?.enabled ||
      attendanceModeSummary.global?.modes?.hybrid?.enabled ||
      attendanceModeSummary.byDepartment?.some(c => c.modes?.geoFence?.enabled || c.modes?.hybrid?.enabled) ||
      attendanceModeSummary.byRole?.some(c => c.modes?.geoFence?.enabled || c.modes?.hybrid?.enabled) ||
      attendanceModeSummary.byLocation?.some(c => c.modes?.geoFence?.enabled || c.modes?.hybrid?.enabled)
    )
  }, [attendanceModeSummary])

  // Role-specific navigation categories
  const getNavigationCategories = (faceRecognitionEnabled, geoFenceEnabled) => {
    const role = user?.role

    // Employee Navigation - Self-Service Only
    if (role === 'employee') {
      return [
        {
          title: 'Main',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'My ESS Portal', href: '/ess-dashboard', icon: Sparkles },
            { name: 'My Profile', href: '/my-profile', icon: UserCircle },
          ]
        },
        {
          title: 'Attendance & Time',
          items: [
            { name: 'My Attendance', href: '/attendance', icon: Clock },
            { name: 'My Roster', href: '/my-roster', icon: Calendar },
            ...(faceRecognitionEnabled ? [{ name: 'Face Attendance Logs', href: '/face-attendance-logs', icon: Camera }] : []),
          ]
        },
        {
          title: 'Leaves',
          items: [
            { name: 'My Leaves', href: '/leaves', icon: Calendar },
            { name: 'Leave Balance', href: '/leave-balance', icon: Calendar },
          ]
        },
        {
          title: 'Performance',
          items: [
            { name: 'My Goals', href: '/performance/goals', icon: Target },
            { name: 'Self-Assessment', href: '/performance/self-assessment', icon: Star },
            // Will use later - Manager Evaluation not yet implemented
            // { name: 'My Performance Review', href: '/performance/my-review', icon: CheckCircle },
          ]
        },
        {
          title: 'Payroll',
          items: [
            { name: 'My Payslips', href: '/payroll', icon: DollarSign },
          ]
        },
        {
          title: 'Assets & Expenses',
          items: [
            { name: 'My Assets', href: '/my-assets', icon: Briefcase },
            { name: 'My Expenses', href: '/expenses', icon: Receipt },
          ]
        },
        {
          title: 'Requests & Grievances',
          items: [
            { name: 'My Requests', href: '/my-requests', icon: FileText },
            { name: 'Change Requests', href: '/change-requests', icon: FileEdit },
            { name: 'Grievances', href: '/grievances', icon: AlertCircle },
            { name: 'Shift Change Requests', href: '/shifts/change-requests', icon: RotateCw },
          ]
        },
        {
          title: 'Resignation',
          items: [
            { name: 'Submit Resignation', href: '/resignation/submit', icon: FileText },
            { name: 'My Resignation', href: '/resignation/my-resignation', icon: FileText },
          ]
        },
        {
          title: 'Documents',
          items: [
            { name: 'My Documents', href: '/documents', icon: FileText },
          ]
        },
        {
          title: 'NABH Compliance',
          items: [
            { name: 'My Training', href: '/training/records', icon: GraduationCap },
            { name: 'My Health Records', href: '/occupational-health/dashboard', icon: Activity },
            { name: 'My Privileges', href: '/privileging/privileges', icon: Shield },
          ]
        },
      ]
    }

    // HR Navigation
    if (role === 'hr') {
      return [
        {
          title: 'Main',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'My Profile', href: '/my-profile', icon: UserCircle },
          ]
        },
        {
          title: 'Employee Management',
          items: [
            { name: 'Employees', href: '/employees', icon: Users },
            { name: 'Change Requests', href: '/change-requests', icon: FileEdit },
            { name: 'Grievances', href: '/grievances', icon: AlertCircle },
            { name: 'Resignation Review', href: '/resignation/review', icon: FileText },
            { name: 'Exit Processing', href: '/exit/processing', icon: FileCheck2 },
          ]
        },
        {
          title: 'Shift Management',
          items: [
            { name: 'Shifts', href: '/shifts', icon: Clock },
            { name: 'Shift Change Requests', href: '/shifts/change-requests', icon: RotateCw },
            { name: 'Shift Rotations', href: '/shifts/rotations', icon: RotateCw },
          ]
        },
        {
          title: 'Recruitment & Onboarding',
          items: [
            { name: 'Job Openings', href: '/recruitment/jobs', icon: Briefcase },
            { name: 'Candidates', href: '/recruitment/candidates', icon: Users },
            { name: 'Onboarding Templates', href: '/onboarding/templates', icon: UserCheck },
            { name: 'Start Onboarding', href: '/onboarding/start', icon: UserCheck },
            { name: 'Onboarding Dashboard', href: '/onboarding/dashboard', icon: TrendingUp },
            { name: 'Onboarding Instances', href: '/onboarding/instances', icon: UserCheck },
          ]
        },
        {
          title: 'Attendance & Roster',
          items: [
            { name: 'Attendance Dashboard', href: '/attendance-dashboard', icon: Clock },
            { name: 'Real-Time Monitoring', href: '/real-time-attendance', icon: Monitor },
            { name: 'Roster', href: '/roster', icon: Calendar },
            ...(faceRecognitionEnabled ? [{ name: 'Face Attendance Logs', href: '/face-attendance-logs', icon: Camera }] : []),
          ]
        },
        {
          title: 'Leaves',
          items: [
            { name: 'Leave Approvals', href: '/leave-approvals', icon: Calendar },
            { name: 'Leave Types', href: '/leave-types', icon: Calendar },
          ]
        },
        {
          title: 'Performance',
          items: [
            { name: 'Performance Cycles', href: '/performance/cycles', icon: Target },
            { name: 'Goals / KRAs', href: '/performance/goals', icon: Target },
            // Will use later - Manager Evaluation not yet implemented
            // { name: 'Performance Reviews', href: '/performance/reviews', icon: CheckCircle },
          ]
        },
        {
          title: 'Payroll',
          items: [
            { name: 'Salary Structures', href: '/salary-structures', icon: DollarSign },
            { name: 'Employee Salary', href: '/employee-salary', icon: DollarSign },
            { name: 'Payroll Dashboard', href: '/payroll-dashboard', icon: DollarSign },
            { name: 'Payroll Reports', href: '/payroll-reports', icon: DollarSign },
            { name: 'F&F Settlement', href: '/fnf-settlement', icon: DollarSign },
          ]
        },
        {
          title: 'Assets & Expenses',
          items: [
            { name: 'Assets', href: '/assets', icon: Package },
            { name: 'Expense Approvals', href: '/expense-approvals', icon: FileCheck2 },
          ]
        },
        {
          title: 'Documents',
          items: [
            { name: 'Document Management', href: '/documents', icon: FileText },
          ]
        },
        {
          title: 'NABH Compliance',
          items: [
            { name: 'Training Dashboard', href: '/training/dashboard', icon: GraduationCap },
            { name: 'Training Programs', href: '/training/programs', icon: GraduationCap },
            { name: 'Training Records', href: '/training/records', icon: ClipboardCheck },
            { name: 'Competency Matrices', href: '/training/competency-matrices', icon: Target },
            { name: 'Competency Assessments', href: '/training/competency-assessments', icon: CheckCircle },
            { name: 'Occupational Health', href: '/occupational-health/dashboard', icon: Heart },
            { name: 'Privileging Dashboard', href: '/privileging/dashboard', icon: Shield },
            { name: 'Privilege Categories', href: '/privileging/categories', icon: Shield },
            { name: 'Privilege Committees', href: '/privileging/committees', icon: Users },
            { name: 'Privilege Requests', href: '/privileging/requests', icon: FileCheck2 },
            { name: 'Doctor Privileges', href: '/privileging/privileges', icon: Stethoscope },
          ]
        },
        {
          title: 'Analytics & Settings',
          items: [
            { name: 'Analytics', href: '/analytics', icon: TrendingUp },
            ...(geoFenceEnabled ? [{ name: 'Geo-Fences', href: '/geofences', icon: MapPin }] : []),
            ...(faceRecognitionEnabled ? [
              { name: 'Cameras', href: '/cameras', icon: Camera },
              { name: 'Camera Assignments', href: '/camera-assignments', icon: UserPlus }
            ] : []),
            { name: 'Settings', href: '/settings', icon: Settings },
          ]
        },
      ]
    }

    // Admin Navigation - Focused on System Administration and High-Level Oversight
    if (role === 'admin') {
      return [
        {
          title: 'Main',
          items: [
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'My Profile', href: '/my-profile', icon: UserCircle },
          ]
        },
        {
          title: 'Employee Overview',
          items: [
            { name: 'Employees', href: '/employees', icon: Users },
          ]
        },
        {
          title: 'Payroll & Financial',
          items: [
            { name: 'Payroll Dashboard', href: '/payroll-dashboard', icon: DollarSign },
            { name: 'Payroll Reports', href: '/payroll-reports', icon: DollarSign },
            { name: 'Salary Structures', href: '/salary-structures', icon: DollarSign },
          ]
        },
        {
          title: 'System Administration',
          items: [
            { name: 'Company Settings', href: '/company', icon: Building2 },
            { name: 'Attendance Modes', href: '/attendance-modes', icon: Clock },
            { name: 'Shifts', href: '/shifts', icon: Clock },
            { name: 'Roles', href: '/roles', icon: Shield },
            { name: 'Permissions', href: '/permissions', icon: Key },
            { name: 'Audit Logs', href: '/audit', icon: Activity },
            { name: 'Settings', href: '/settings', icon: Settings },
          ]
        },
        {
          title: 'NABH Compliance',
          items: [
            { name: 'Training Dashboard', href: '/training/dashboard', icon: GraduationCap },
            { name: 'Training Programs', href: '/training/programs', icon: GraduationCap },
            { name: 'Occupational Health', href: '/occupational-health/dashboard', icon: Heart },
            { name: 'Privileging Dashboard', href: '/privileging/dashboard', icon: Shield },
            { name: 'Privilege Categories', href: '/privileging/categories', icon: Shield },
            { name: 'Privilege Committees', href: '/privileging/committees', icon: Users },
          ]
        },
        {
          title: 'Analytics & Configuration',
          items: [
            { name: 'Analytics', href: '/analytics', icon: TrendingUp },
            ...(geoFenceEnabled ? [{ name: 'Geo-Fences', href: '/geofences', icon: MapPin }] : []),
            ...(faceRecognitionEnabled ? [
              { name: 'Cameras', href: '/cameras', icon: Camera },
              { name: 'Camera Assignments', href: '/camera-assignments', icon: UserPlus }
            ] : []),
          ]
        },
      ]
    }

    // Default fallback (shouldn't reach here, but just in case)
    return [
      {
        title: 'Main',
        items: [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'My Profile', href: '/my-profile', icon: UserCircle },
        ]
      }
    ]
  }

  // Get navigation categories based on role and attendance mode configuration
  const navigationCategories = useMemo(() => {
    return getNavigationCategories(isFaceRecognitionEnabled, isGeoFenceEnabled)
  }, [user?.role, isFaceRecognitionEnabled, isGeoFenceEnabled])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        ></div>
        <div className={`fixed inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-white shadow-2xl transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 items-center justify-between px-4 border-b-2 border-gray-400 flex-shrink-0 bg-gradient-to-r from-primary-600 to-primary-700">
            <Logo variant="white" className="flex-1" />
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-4 min-h-0">
            {navigationCategories.map((category) => (
              <div key={category.title} className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {category.title}
                </h3>
                {category.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-blue-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100 border-transparent'
                      }`}
                    >
                      <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:h-screen">
        <div className="flex flex-col h-full bg-white border-r-2 border-gray-400 shadow-lg">
          <div className="flex h-16 items-center px-4 border-b-2 border-gray-400 flex-shrink-0 bg-gradient-to-r from-primary-600 to-primary-700">
            <Logo variant="white" />
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-4 min-h-0">
            {navigationCategories.map((category) => (
              <div key={category.title} className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {category.title}
                </h3>
                {category.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-blue-600 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100 border-transparent'
                      }`}
                    >
                      <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>
      </div>

        {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-14 sm:h-16 bg-white shadow-md border-b-2 border-gray-400">
          <button
            className="px-3 sm:px-4 text-gray-700 hover:bg-gray-100 lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-1 justify-between px-2 sm:px-4">
            <div className="flex flex-1"></div>
            <div className="ml-2 sm:ml-4 flex items-center space-x-2 sm:space-x-4">
              <NotificationCenter />
              <div className="hidden sm:block text-sm text-gray-700 truncate max-w-[150px] lg:max-w-none">
                {user?.employee?.firstName} {user?.employee?.lastName || user?.email}
              </div>
              <button
                onClick={logout}
                className="flex items-center px-2 sm:px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors min-h-[44px]"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4 sm:py-6">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 xl:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
