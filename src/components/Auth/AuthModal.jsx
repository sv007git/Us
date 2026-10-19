import React, { useState } from 'react'
import { Heart, Lock, Mail, User, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import confetti from 'canvas-confetti'

export const AuthModal = () => {
  const { currentTheme } = useTheme()
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin', 'signup', 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setIsLoading(true)

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please choose a display name so your partner knows who you are.')
        }
        await signUp(email, password, displayName)
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } })
        setSuccessMsg('Account created successfully! Welcome to Just You & Me.')
      } else if (mode === 'signin') {
        await signIn(email, password)
      } else if (mode === 'forgot') {
        await resetPassword(email)
        setSuccessMsg('Password reset link sent! Please check your email inbox.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${currentTheme.bgGradient}`}>
      <div className={`w-full max-w-md bg-white/90 dark:bg-midnight-900/90 backdrop-blur-xl border ${currentTheme.border} rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden`}>
        {/* Soft decorative background circles */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-pink-400/10 dark:bg-pink-400/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-rose-400/10 dark:bg-rose-400/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center mb-6 relative">
          <div className={`inline-flex p-3 rounded-2xl ${currentTheme.buttonGrad} text-white shadow-lg ${currentTheme.shadow} mb-3`}>
            <Heart className="w-7 h-7 fill-current animate-heartbeat text-white" />
          </div>
          <h1 className={`text-2xl font-bold font-romantic ${currentTheme.activeText} tracking-wide`}>
            Just You & Me 💗
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            A private romantic world created exclusively for the two of you.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className={`flex p-1 ${currentTheme.softBg} rounded-2xl mb-6`}>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              mode === 'signin'
                ? `bg-white dark:bg-midnight-800 ${currentTheme.activeText} shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              mode === 'signup'
                ? `bg-white dark:bg-midnight-800 ${currentTheme.activeText} shadow-sm`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-600 dark:text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Your Name / Nickname
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. My Darling, Sweetheart, Harish"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className={`text-[11px] ${currentTheme.activeText} hover:underline`}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-2 py-3 px-4 rounded-xl ${currentTheme.buttonGrad} hover:opacity-95 text-white font-semibold text-sm shadow-md ${currentTheme.shadow} flex items-center justify-center space-x-2 transition disabled:opacity-50`}
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin'
                    ? 'Enter Our Space'
                    : mode === 'signup'
                    ? 'Start Our Journey'
                    : 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`w-full mt-4 text-center text-xs text-slate-500 dark:text-slate-400 hover:${currentTheme.activeText}`}
          >
            Back to Sign In
          </button>
        )}

        {/* Footer info */}
        <div className={`mt-6 pt-4 border-t ${currentTheme.borderLight} text-center text-[11px] text-slate-400`}>
          <span>Protected by Row Level Security & End-to-End Encryption 🔒</span>
        </div>
      </div>
    </div>
  )
}
