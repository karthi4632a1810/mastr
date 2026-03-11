export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone) => {
  const re = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
  return re.test(phone)
}

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== ''
}

export const validateMinLength = (value, min) => {
  return value && value.length >= min
}

export const validateMaxLength = (value, max) => {
  return !value || value.length <= max
}

export const validateNumber = (value, min = null, max = null) => {
  const num = parseFloat(value)
  if (isNaN(num)) return false
  if (min !== null && num < min) return false
  if (max !== null && num > max) return false
  return true
}

export const validateDate = (date, minDate = null, maxDate = null) => {
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  if (minDate && d < new Date(minDate)) return false
  if (maxDate && d > new Date(maxDate)) return false
  return true
}
