import { Calendar } from 'lucide-react'
import Input from './Input'

const DatePicker = ({ label, value, onChange, error, helperText, min, max, required, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          type="date"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className={`input pl-10 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          required={required}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export default DatePicker
