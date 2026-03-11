const Select = ({ 
  label, 
  error, 
  helperText,
  options = [],
  placeholder = 'Select an option',
  className = '',
  value,
  ...props 
}) => {
  // Ensure value is always a string to prevent controlled/uncontrolled warning
  const safeValue = value !== undefined && value !== null ? String(value) : ''
  
  const baseSelectClasses = `
    w-full px-4 py-2.5 
    text-gray-900 
    bg-white 
    border border-gray-300 
    rounded-lg 
    shadow-sm
    transition-all duration-200
    focus:outline-none 
    focus:ring-2 
    focus:ring-primary-500 
    focus:border-primary-500
    disabled:bg-gray-50 
    disabled:text-gray-500 
    disabled:cursor-not-allowed
    hover:border-gray-400
    appearance-none
    bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")] 
    bg-[right_0.5rem_center] 
    bg-[length:1.5em_1.5em] 
    bg-no-repeat
    pr-10
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
      <select
        className={`${baseSelectClasses} ${errorClasses} ${className}`}
        value={safeValue}
        {...props}
      >
        {placeholder && <option value="" className="text-gray-400">{placeholder}</option>}
        {options.map((option) => (
          <option 
            key={typeof option === 'object' ? option.value : option} 
            value={typeof option === 'object' ? option.value : option}
            className="text-gray-900"
          >
            {typeof option === 'object' ? option.label : option}
          </option>
        ))}
      </select>
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

export default Select
