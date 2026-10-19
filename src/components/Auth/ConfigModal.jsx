import React, { useState } from 'react'
import { KeyRound, Database, Radio, X, Check, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import {
  initialUrl,
  initialKey,
  saveRuntimeConfig,
  clearRuntimeConfig,
  credentialSource,
  formatSupabaseUrl,
  testSupabaseConnection,
} from '../../lib/supabaseClient'

export const ConfigModal = ({ isOpen, onClose }) => {
  const { currentTheme } = useTheme()
  const [supabaseUrl, setSupabaseUrl] = useState(initialUrl || '')
  const [supabaseKey, setSupabaseKey] = useState(initialKey || '')
  const [turnUrls, setTurnUrls] = useState(() => {
    try {
      const saved = localStorage.getItem('just_you_me_turn_config')
      return saved ? JSON.parse(saved).urls.join(', ') : ''
    } catch {
      return ''
    }
  })
  const [turnUser, setTurnUser] = useState(() => {
    try {
      const saved = localStorage.getItem('just_you_me_turn_config')
      return saved ? JSON.parse(saved).username || '' : ''
    } catch {
      return ''
    }
  })
  const [turnPass, setTurnPass] = useState(() => {
    try {
      const saved = localStorage.getItem('just_you_me_turn_config')
      return saved ? JSON.parse(saved).credential || '' : ''
    } catch {
      return ''
    }
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleUrlChange = (e) => {
    const raw = e.target.value
    setSupabaseUrl(raw)
    setTestResult(null)
    setError(null)
  }

  const handleTestConnection = async () => {
    setError(null)
    setTestResult(null)
    setIsTesting(true)

    const cleanedUrl = formatSupabaseUrl(supabaseUrl)
    setSupabaseUrl(cleanedUrl)

    try {
      await testSupabaseConnection(cleanedUrl, supabaseKey)
      setTestResult({
        success: true,
        message: `Successfully connected to ${cleanedUrl}!`,
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message,
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    setError(null)

    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setError('Please provide both Supabase Project URL and Anon Key.')
      return
    }

    const cleanedUrl = formatSupabaseUrl(supabaseUrl)

    // Save TURN config if provided
    if (turnUrls.trim()) {
      const config = {
        urls: turnUrls.split(',').map((u) => u.trim()),
        username: turnUser.trim(),
        credential: turnPass.trim(),
      }
      localStorage.setItem('just_you_me_turn_config', JSON.stringify(config))
    } else {
      localStorage.removeItem('just_you_me_turn_config')
    }

    try {
      saveRuntimeConfig(cleanedUrl, supabaseKey)
      setSavedSuccess(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className={`w-full max-w-lg bg-white dark:bg-midnight-900 border ${currentTheme.border} rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl ${currentTheme.softBg} ${currentTheme.activeText} flex items-center justify-center`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Supabase Configuration</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credentials are saved securely in your browser's local storage.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {testResult && (
          <div
            className={`mb-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-600 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-600 dark:text-red-300'
            }`}
          >
            {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" /> Configuration saved! Reloading...
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Supabase URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Supabase Project URL <span className={currentTheme.activeText}>*</span>
              </label>
              <span className="text-[10px] text-slate-400">Format: https://xyz.supabase.co</span>
            </div>
            <input
              type="text"
              value={supabaseUrl}
              onChange={handleUrlChange}
              placeholder="https://your-project-ref.supabase.co"
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${currentTheme.ring}`}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in: <strong>Project Settings → API → Project URL</strong>. (Do not paste the dashboard browser URL).
            </p>
          </div>

          {/* Supabase Anon Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supabase Anon Public Key <span className={currentTheme.activeText}>*</span>
            </label>
            <textarea
              rows={3}
              value={supabaseKey}
              onChange={(e) => {
                setSupabaseKey(e.target.value)
                setTestResult(null)
              }}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 ${currentTheme.ring}`}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in: <strong>Project Settings → API → Project API Keys → anon / public</strong>.
            </p>
          </div>

          {/* Test Connection Button */}
          <div>
            <button
              type="button"
              disabled={isTesting || !supabaseUrl || !supabaseKey}
              onClick={handleTestConnection}
              className={`w-full py-2.5 px-4 rounded-xl border ${currentTheme.border} ${currentTheme.softHover} ${currentTheme.activeText} text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50`}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing Connection to Supabase...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test Connection Now</span>
                </>
              )}
            </button>
          </div>

          {/* WebRTC TURN Server Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <Radio className={`w-4 h-4 ${currentTheme.activeText}`} />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                WebRTC TURN Relay (Optional for cellular carrier networks)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Google STUN is used by default. For strict NAT traversal between mobile networks, enter TURN server credentials (e.g. free Metered.ca).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  TURN Server URL(s)
                </label>
                <input
                  type="text"
                  value={turnUrls}
                  onChange={(e) => setTurnUrls(e.target.value)}
                  placeholder="turn:global.relay.metered.ca:80"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    TURN Username
                  </label>
                  <input
                    type="text"
                    value={turnUser}
                    onChange={(e) => setTurnUser(e.target.value)}
                    placeholder="user123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    TURN Credential
                  </label>
                  <input
                    type="password"
                    value={turnPass}
                    onChange={(e) => setTurnPass(e.target.value)}
                    placeholder="password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {credentialSource === 'localStorage' && (
              <button
                type="button"
                onClick={clearRuntimeConfig}
                className="text-xs text-red-500 hover:underline"
              >
                Clear Saved Config
              </button>
            )}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl ${currentTheme.buttonGrad} text-white text-xs font-semibold ${currentTheme.shadow} hover:opacity-95`}
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
