'use client'

import { useState } from 'react'
import { BarChart3, Users, Coffee, Eye, EyeOff } from 'lucide-react'
import './page.css'
import { useAuthRedirect } from '../../hooks/useAuthRedirect'

type UserRole = 'manager' | 'barista'
type FormMode = 'signin' | 'signup'

interface FormData {
  username: string
  password: string
}

interface FieldErrors {
  username: string
  password: string
}

interface PasswordStrength {
  score: number
  label: string
  color: string
}

export default function CafeStockLogin() {
  useAuthRedirect()
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager')
  const [formMode, setFormMode] = useState<FormMode>('signin')
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, label: '', color: '' }

    let score = 0
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    const isLongEnough = password.length >= 12

    if (hasUpperCase) score++
    if (hasLowerCase) score++
    if (hasNumber) score++
    if (hasSymbol) score++
    if (isLongEnough) score++

    if (score === 5) return { score: 5, label: 'Strong', color: '#22c55e' }
    if (score >= 3) return { score: 3, label: 'Medium', color: '#f59e0b' }
    return { score: 1, label: 'Weak', color: '#ef4444' }
  }

  const validatePasswordRequirements = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSymbol) {
      return 'Password must include uppercase, lowercase, number, and symbol'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters'
    }
    return ''
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleModeChange = (mode: FormMode) => {
    setFormMode(mode)
    setFormData({
      username: '',
      password: ''
    })
    setFieldErrors({
      username: '',
      password: ''
    })

    if (mode === 'signup') {
      setSelectedRole('barista')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({ username: '', password: '' })
    setIsLoading(true)

    // Client-side validation for signup
    if (formMode === 'signup') {
      const passwordError = validatePasswordRequirements(formData.password)
      if (passwordError) {
        setFieldErrors(prev => ({ ...prev, password: passwordError }))
        setIsLoading(false)
        return
      }
    }

    try {
      const endpoint = formMode === 'signin' ? '/signin' : '/signup'
      const response = await fetch(`http://localhost:3001/api/auth${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: selectedRole
        })
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('cafestock_token', data.token)
        localStorage.setItem('cafestock_user', JSON.stringify(data.user))

        if (formMode === 'signup') {
          // Switch to sign-in mode with barista role pre-selected
          setFormMode('signin')
          setSelectedRole('barista')
          setFormData({ username: '', password: '' })
          alert('Account created successfully! Please sign in.')
        } else {
          if (data.user.role === 'barista') {
            window.location.href = '/barista/dashboard'
          } else if (data.user.role === 'manager') {
            window.location.href = '/manager/dashboard'
          }
        }
        
      } else {
        // Handle specific error messages
        const errorMsg = data.error || 'Something went wrong'
        
        // Map errors to specific fields
        if (errorMsg.toLowerCase().includes('username already exists')) {
          setFieldErrors(prev => ({ ...prev, username: errorMsg }))
        } else if (errorMsg.toLowerCase().includes('password')) {
          setFieldErrors(prev => ({ ...prev, password: errorMsg }))
        } else if (errorMsg.toLowerCase().includes('invalid username and password')) {
          setFieldErrors({ username: 'Invalid username', password: 'Invalid password' })
        } else if (errorMsg.toLowerCase().includes('invalid username or password')) {
          setFieldErrors({ username: errorMsg, password: '' })
        } else {
          setFieldErrors(prev => ({ ...prev, username: errorMsg }))
        }
      }
    } catch (err) {
      console.error('Request error:', err)
      setFieldErrors(prev => ({ 
        ...prev, 
        username: 'Unable to connect to server. Please try again.' 
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = formMode === 'signup' ? calculatePasswordStrength(formData.password) : null

  return (
    <div className="cafe-stock-container">
      <div className="branding-section">
        <div className="branding-content">
          <div className="logo-container">
            <div className="logo-icon logo-icon-primary">
              <Coffee size={36} />
            </div>
            <h1 className="brand-title">BeanTrack</h1>
          </div>

          <h2 className="tagline">
            Smart Cafe Inventory
          </h2>
          <p className="description">
            Efficiently manage ingredients and stock while streamlining operations through real‑time insights and alerts.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-header">
                <div className="feature-icon feature-icon-primary">
                  <BarChart3 size={24} />
                </div>
                <h3 className="feature-title">Smart Tracking</h3>
              </div>
              <p className="feature-description">
                Real-time inventory updates
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-header">
                <div className="feature-icon feature-icon-secondary">
                  <Users size={24} />
                </div>
                <h3 className="feature-title">Team Management</h3>
              </div>
              <p className="feature-description">
                Role-based access control
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-card">
          <h2 className="form-title">
            {formMode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="form-subtitle">
            {formMode === 'signin' 
              ? 'Access your cafe dashboard by signing in'
              : 'Set up your barista account to begin'
            }
          </p>

          <div className="mode-toggle">
            <button
              onClick={() => handleModeChange('signin')}
              className={`mode-button ${formMode === 'signin' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              onClick={() => handleModeChange('signup')}
              className={`mode-button ${formMode === 'signup' ? 'active' : ''}`}
            >
              Sign Up
            </button>
          </div>

          {formMode === 'signin' && (
            <div className="role-section">
              <p className="role-label">Select role to sign in</p>
              <div className="role-buttons">
                <button
                  onClick={() => handleRoleChange('manager')}
                  className={`role-button ${selectedRole === 'manager' ? 'active' : ''}`}
                >
                  <div>Manager</div>
                  <div className="role-subtitle">Full Access</div>
                </button>
                <button
                  onClick={() => handleRoleChange('barista')}
                  className={`role-button ${selectedRole === 'barista' ? 'active' : ''}`}
                >
                  <div>Barista</div>
                  <div className="role-subtitle">Usage Tracking</div>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter your username"
                className={`form-input ${fieldErrors.username ? 'input-error' : ''}`}
                required
                disabled={isLoading}
              />
              {fieldErrors.username && (
                <div className="error-message">{fieldErrors.username}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="error-message">{fieldErrors.password}</div>
              )}
              
              {formMode === 'signup' && formData.password && (
                <div className="password-strength-container">
                  <div className="password-strength-bar">
                    <div 
                      className="password-strength-fill"
                      style={{ 
                        width: `${(passwordStrength!.score / 5) * 100}%`,
                        backgroundColor: passwordStrength!.color
                      }}
                    />
                  </div>
                  <div className="password-strength-label" style={{ color: passwordStrength!.color }}>
                    {passwordStrength!.label}
                  </div>
                  <div className="password-requirements">
                    <div className="requirement-item">
                      <span className={formData.password.length >= 12 ? 'met' : 'unmet'}>
                        {formData.password.length >= 12 ? '✓' : '○'}
                      </span>
                      <span>At least 12 characters</span>
                    </div>
                    <div className="requirement-item">
                      <span className={/[A-Z]/.test(formData.password) ? 'met' : 'unmet'}>
                        {/[A-Z]/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span>Uppercase letter</span>
                    </div>
                    <div className="requirement-item">
                      <span className={/[a-z]/.test(formData.password) ? 'met' : 'unmet'}>
                        {/[a-z]/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span>Lowercase letter</span>
                    </div>
                    <div className="requirement-item">
                      <span className={/\d/.test(formData.password) ? 'met' : 'unmet'}>
                        {/\d/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span>Number</span>
                    </div>
                    <div className="requirement-item">
                      <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'met' : 'unmet'}>
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'}
                      </span>
                      <span>Symbol (!@#$%^&*...)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}  
            >
              {isLoading ? 'Please wait...' : 
                formMode === 'signin' 
                  ? `Sign In as ${selectedRole === 'manager' ? 'Manager' : 'Barista'}`
                  : 'Create Barista Account'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}