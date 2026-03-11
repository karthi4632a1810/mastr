import { useState } from 'react'
import { validateEmail, validatePhone, validateRequired, validateNumber } from '../utils/validators'

export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validate = (fieldName, value) => {
    const rules = validationRules[fieldName]
    if (!rules) return ''

    for (const rule of rules) {
      if (rule.required && !validateRequired(value)) {
        return rule.message || `${fieldName} is required`
      }
      if (rule.email && !validateEmail(value)) {
        return rule.message || 'Invalid email format'
      }
      if (rule.phone && !validatePhone(value)) {
        return rule.message || 'Invalid phone number'
      }
      if (rule.minLength && !validateMinLength(value, rule.minLength)) {
        return rule.message || `Minimum ${rule.minLength} characters required`
      }
      if (rule.number && !validateNumber(value, rule.min, rule.max)) {
        return rule.message || 'Invalid number'
      }
    }
    return ''
  }

  const handleChange = (fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
    
    if (touched[fieldName]) {
      const error = validate(fieldName, value)
      setErrors(prev => ({ ...prev, [fieldName]: error }))
    }
  }

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    const error = validate(fieldName, values[fieldName])
    setErrors(prev => ({ ...prev, [fieldName]: error }))
  }

  const validateAll = () => {
    const newErrors = {}
    const newTouched = {}
    
    Object.keys(validationRules).forEach(fieldName => {
      newTouched[fieldName] = true
      const error = validate(fieldName, values[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })
    
    setTouched(newTouched)
    setErrors(newErrors)
    
    return Object.keys(newErrors).length === 0
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setValues
  }
}
