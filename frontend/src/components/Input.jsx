const Input = ({ 
  label, 
  error, 
  helperText,
  className = '',
  multiline = false,
  rows = 3,
  value,
  ...props 
}) => {
  // Ensure value is always a string to prevent controlled/uncontrolled warning
  const safeValue = value !== undefined && value !== null ? String(value) : ''
  
  const baseInputClasses = `
    w-full px-4 py-2.5 
    text-gray-900 
    bg-white 
    border border-gray-300 
    rounded-lg 
    shadow-sm
    transition-all duration-200
    placeholder:text-gray-400
    focus:outline-none 
    focus:ring-2 
    focus:ring-primary-500 
    focus:border-primary-500
    disabled:bg-gray-50 
    disabled:text-gray-500 
    disabled:cursor-not-allowed
    hover:border-gray-400
  `
  
  const errorClasses = error 
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
    : ''
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          className={`${baseInputClasses} ${errorClasses} ${className}`}
          rows={rows}
          value={safeValue}
          {...props}
        />
      ) : (
        <input
          className={`${baseInputClasses} ${errorClasses} ${className}`}
          value={safeValue}
          {...props}
        />
      )}
      {error && (
        <p className="mt-1.5 text-sm font-medium text-red-600 flex items-center">
          <span className="mr-1">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

export default Input
