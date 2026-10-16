import React, { useState } from 'react'
import { KeyRound, Database, Radio, X, Check, ExternalLink } from 'lucide-react'
import { initialUrl, initialKey, saveRuntimeConfig, clearRuntimeConfig, credentialSource } from '../../lib/supabaseClient'

export const ConfigModal = ({ isOpen, onClose }) => {
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
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSave = (e) => {
    e.preventDefault()
    setError(null)

    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setError('Please provide both Supabase Project URL and Anon Key.')
      return
    }

    if (!supabaseUrl.startsWith('https://')) {
      setError('Supabase URL must start with https://')
      return
    }

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
      saveRuntimeConfig(supabaseUrl, supabaseKey)
      setSavedSuccess(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-midnight-900 border border-rose-200 dark:border-rose-900/40 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Service Configuration</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Credentials are saved in your browser and used securely.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-300 text-xs">
            {error}
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supabase Project URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Supabase Anon Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supabase Anon Public Key <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* WebRTC TURN Server Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 mb-2">
              <Radio className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                WebRTC TURN Server (Optional for strict mobile networks)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Google STUN is used by default. For carrier NAT traversal on cellular networks, provide TURN credentials (e.g. from Metered.ca).
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
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 hover:opacity-95"
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
