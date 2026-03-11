const SkeletonLoader = ({ 
  variant = 'text', 
  width = '100%', 
  height = '1rem',
  className = '',
  count = 1 
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded'
  
  const variants = {
    text: 'h-4',
    heading: 'h-6',
    avatar: 'rounded-full',
    card: 'h-48',
    button: 'h-10 w-24',
    image: 'h-64'
  }

  if (variant === 'card') {
    return (
      <div className={`${baseClasses} ${className}`} style={{ width, height }}>
        <div className="p-4 space-y-3">
          <div className={`${baseClasses} h-4 w-3/4`}></div>
          <div className={`${baseClasses} h-4 w-full`}></div>
          <div className={`${baseClasses} h-4 w-5/6`}></div>
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className={`${baseClasses} h-4 w-1/4`}></div>
            <div className={`${baseClasses} h-4 w-1/4`}></div>
            <div className={`${baseClasses} h-4 w-1/4`}></div>
            <div className={`${baseClasses} h-4 w-1/4`}></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClasses} ${variants[variant] || ''} ${className}`}
          style={{ width: count === 1 ? width : undefined, height }}
        />
      ))}
    </>
  )
}

export default SkeletonLoader

