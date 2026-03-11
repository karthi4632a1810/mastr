export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (date, format = 'short') => {
  if (!date) return '-'
  const d = new Date(date)
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } else if (format === 'long') {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  } else if (format === 'time') {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  
  return d.toLocaleDateString()
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatPhone = (phone) => {
  if (!phone) return '-'
  // Format: +91-9876543210
  return phone.replace(/(\d{2})(\d{5})(\d{5})/, '+$1-$2-$3')
}

export const formatEmployeeName = (employee) => {
  if (!employee) return '-'
  return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email || '-'
}

export const formatStatus = (status) => {
  if (!status) return '-'
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}
