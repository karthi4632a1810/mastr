import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const Logo = ({ variant = 'default', showText = true, className = '' }) => {
  const variants = {
    default: 'text-primary-600',
    white: 'text-white',
    dark: 'text-gray-900'
  }

  const textVariants = {
    default: 'text-gray-900',
    white: 'text-white',
    dark: 'text-gray-900'
  }

  const iconColor = variants[variant] || variants.default
  const textColor = textVariants[variant] || textVariants.default

  return (
    <Link to="/dashboard" className={`flex items-center space-x-3 ${className}`}>
      <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg ${variant === 'white' ? 'bg-white/10 backdrop-blur-sm' : ''}`}>
        <Building2 className={`h-6 w-6 ${variant === 'white' ? 'text-white' : 'text-white'}`} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`text-xl font-bold leading-tight ${textColor}`}>
            Vaaltic
          </span>
          <span className={`text-xs font-medium ${variant === 'white' ? 'text-white/80' : 'text-gray-600'}`}>
            HRMS
          </span>
        </div>
      )}
    </Link>
  )
}

export default Logo

