import { useAuth } from '../contexts/AuthContext'
import EmployeeDashboard from './dashboards/EmployeeDashboard'
import HRDashboard from './dashboards/HRDashboard'
import AdminDashboard from './dashboards/AdminDashboard'

const Dashboard = () => {
  const { user } = useAuth()
  
  // Route to role-specific dashboard
  if (user?.role === 'admin') {
    return <AdminDashboard />
  }
  
  if (user?.role === 'hr') {
    return <HRDashboard />
  }
  
  // Default to employee dashboard
  return <EmployeeDashboard />
}

export default Dashboard
