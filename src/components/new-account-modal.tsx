'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { setSessionToken, addStoredAccount } from '@/lib/api-client'
import { 
  X, Eye, EyeOff, Loader2, Check, Crown, ChevronRight, 
  User, Mail, Lock, Shield, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountCreated?: (user: any) => void
}

export function NewAccountModal({ isOpen, onClose, onAccountCreated }: NewAccountModalProps) {
  const { setUser } = useAuth()
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [birthDay, setBirthDay] = useState(0)
  const [birthMonth, setBirthMonth] = useState(0)
  const [birthYear, setBirthYear] = useState(0)
  
  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Security key flow
  const [showSecurityKeyStep, setShowSecurityKeyStep] = useState(false)
  const [securityKey, setSecurityKey] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [securityKeyInput, setSecurityKeyInput] = useState('')
  const [hasCopiedKey, setHasCopiedKey] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  
  // DOB options
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ]
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1900 - 15 }, (_, i) => currentYear - 16 - i)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Password strength
  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }
  
  const passwordStrength = getPasswordStrength(formData.password)
  
  const getStrengthColor = (strength: number) => {
    if (strength <= 1) return 'bg-red-500'
    if (strength <= 2) return 'bg-orange-500'
    if (strength <= 3) return 'bg-yellow-500'
    if (strength <= 4) return 'bg-emerald-500'
    return 'bg-green-500'
  }
  
  const getStrengthLabel = (strength: number) => {
    if (strength <= 1) return 'Weak'
    if (strength <= 2) return 'Fair'
    if (strength <= 3) return 'Good'
    if (strength <= 4) return 'Strong'
    return 'Very Strong'
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validation
    if (!formData.username.trim()) {
      setError('Username is required')
      return
    }
    
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('Username must be 3-20 characters')
      return
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores')
      return
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (!birthDay || !birthMonth || !birthYear) {
      setError('Please select your date of birth')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          birthDay,
          birthMonth,
          birthYear,
        }),
        credentials: 'include',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }
      
      // Show security key step
      setSecurityKey(data.securityKey)
      setPendingUserId(data.user.id)
      setShowSecurityKeyStep(true)
      setShowKeyInput(false)
      setHasCopiedKey(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const copySecurityKey = () => {
    navigator.clipboard.writeText(securityKey)
    setHasCopiedKey(true)
    setTimeout(() => setHasCopiedKey(false), 2000)
  }
  
  const handleConfirmKeySaved = () => {
    setShowKeyInput(true)
    setSecurityKeyInput('')
    setError('')
  }
  
  const handleVerifyKey = async () => {
    if (!pendingUserId || !securityKeyInput.trim()) return
    
    setError('')
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pendingUserId,
          securityKey: securityKeyInput.trim().toUpperCase(),
        }),
        credentials: 'include',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid security key')
      }
      
      if (data.token) {
        setSessionToken(data.token)
        addStoredAccount(data.user, data.token)
      }
      
      setUser(data.user)
      onAccountCreated?.(data.user)
      onClose()
      
      // Reset form
      setFormData({ username: '', email: '', password: '', confirmPassword: '' })
      setBirthDay(0)
      setBirthMonth(0)
      setBirthYear(0)
      setShowSecurityKeyStep(false)
      setSecurityKey('')
      setPendingUserId(null)
      setSecurityKeyInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className={cn(
          "w-full max-w-md transition-all duration-300",
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
      >
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Header with accent */}
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-orange-500" />
            
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Create New Account</h2>
                  <p className="text-xs text-gray-400">Join the Chrona universe</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-5">
            {!showSecurityKeyStep ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.07] transition-all"
                  />
                  <p className="text-[10px] text-gray-500">3-20 characters, letters, numbers, underscores only</p>
                </div>
                
                {/* Email (optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email <span className="text-gray-600 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.07] transition-all"
                  />
                  <p className="text-[10px] text-gray-500">For account recovery (recommended)</p>
                </div>
                
                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full h-11 px-4 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.07] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", getStrengthColor(passwordStrength))}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium",
                        passwordStrength <= 2 ? "text-orange-400" : "text-emerald-400"
                      )}>
                        {getStrengthLabel(passwordStrength)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      className="w-full h-11 px-4 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-red-500/50 focus:bg-white/[0.07] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-[10px] text-red-400">Passwords do not match</p>
                  )}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Passwords match
                    </p>
                  )}
                </div>
                
                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Date of Birth
                  </label>
                  <p className="text-[10px] text-gray-500 -mt-0.5">You must be 16+ to use Chrona</p>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={birthDay || ''}
                      onChange={(e) => setBirthDay(parseInt(e.target.value))}
                      required
                      className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      <option value="" disabled className="bg-[#1a1a1a] text-gray-500">Day</option>
                      {days.map(day => (
                        <option key={day} value={day} className="bg-[#1a1a1a]">{day}</option>
                      ))}
                    </select>
                    
                    <select
                      value={birthMonth || ''}
                      onChange={(e) => setBirthMonth(parseInt(e.target.value))}
                      required
                      className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      <option value="" disabled className="bg-[#1a1a1a] text-gray-500">Month</option>
                      {months.map(month => (
                        <option key={month.value} value={month.value} className="bg-[#1a1a1a]">{month.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={birthYear || ''}
                      onChange={(e) => setBirthYear(parseInt(e.target.value))}
                      required
                      className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm appearance-none cursor-pointer focus:outline-none focus:border-red-500/50 transition-all"
                    >
                      <option value="" disabled className="bg-[#1a1a1a] text-gray-500">Year</option>
                      {years.map(year => (
                        <option key={year} value={year} className="bg-[#1a1a1a]">{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {showKeyInput ? 'Enter Security Key' : 'Save Your Key'}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {showKeyInput ? 'Verify your key to complete setup' : 'Required for all future logins'}
                    </p>
                  </div>
                </div>
                
                {!showKeyInput ? (
                  <>
                    {/* Warning */}
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-300">
                        <strong>Important:</strong> Save this key securely. It cannot be recovered if lost.
                      </p>
                    </div>
                    
                    {/* Security Key Display */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-[10px] text-gray-500 mb-2 text-center uppercase tracking-wider">Your Security Key</p>
                      <div className="bg-black/40 rounded-xl p-4 font-mono text-xl text-center tracking-widest text-white select-all border border-white/5">
                        {securityKey}
                      </div>
                    </div>
                    
                    {/* Copy Button */}
                    <button
                      onClick={copySecurityKey}
                      className={cn(
                        "w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                        hasCopiedKey
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/10 text-white border border-white/10 hover:bg-white/15"
                      )}
                    >
                      {hasCopiedKey ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied to clipboard!
                        </>
                      ) : (
                        <>
                          Copy to clipboard
                        </>
                      )}
                    </button>
                    
                    {/* Continue Button */}
                    <button
                      onClick={handleConfirmKeySaved}
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      I&apos;ve saved my key
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {error && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Enter Security Key</label>
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={securityKeyInput}
                        onChange={(e) => setSecurityKeyInput(e.target.value.toUpperCase())}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl text-center font-mono text-lg tracking-wider text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-all"
                        maxLength={19}
                        autoFocus
                      />
                    </div>
                    
                    <button
                      onClick={handleVerifyKey}
                      disabled={securityKeyInput.replace(/-/g, '').length < 16 || isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Continue
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/5 bg-white/[0.01]">
            <p className="text-[10px] text-gray-500 text-center">
              By creating an account, you agree to our{' '}
              <span className="text-gray-400 hover:text-white cursor-pointer">Terms of Service</span>
              {' '}and{' '}
              <span className="text-gray-400 hover:text-white cursor-pointer">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
