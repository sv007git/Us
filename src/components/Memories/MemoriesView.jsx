import React, { useState, useEffect, useRef } from 'react'
import {
  Image as ImageIcon,
  Plus,
  Heart,
  Calendar,
  X,
  Upload,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { uploadCoupleMedia, getSignedMediaUrl } from '../../lib/storageHelper'
import { MediaLightbox } from '../Chat/MediaLightbox'
import { format } from 'date-fns'
import confetti from 'canvas-confetti'

export const MemoriesView = () => {
  const { user } = useAuth()
  const { coupleSpace, partner } = useCouple()

  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [activeLightbox, setActiveLightbox] = useState(null)

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [memoryDate, setMemoryDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)

  const fileInputRef = useRef(null)

  const fetchMemories = async () => {
    if (!supabase || !coupleSpace?.id) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_space_id', coupleSpace.id)
        .order('memory_date', { ascending: false })

      if (error) throw error

      // Batch resolve signed URLs for private images
      const resolved = await Promise.all(
        (data || []).map(async (m) => {
          if (m.media_url && !m.media_url.startsWith('http')) {
            const signed = await getSignedMediaUrl(m.media_url, 86400)
            return { ...m, media_url: signed || m.media_url }
          }
          return m
        })
      )

      setMemories(resolved)
    } catch (err) {
      console.error('Error fetching memories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [coupleSpace?.id])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleAddMemory = async (e) => {
    e.preventDefault()
    if (!selectedFile || !coupleSpace || !user) return
    setIsUploading(true)
    setError(null)

    try {
      // 1. Upload to couple-media private storage
      const uploaded = await uploadCoupleMedia({
        coupleSpaceId: coupleSpace.id,
        file: selectedFile,
        category: 'memories',
      })

      // 2. Insert into memories table
      const { error: dbError } = await supabase.from('memories').insert({
        couple_space_id: coupleSpace.id,
        created_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        media_url: uploaded.path,
        memory_date: memoryDate,
      })

      if (dbError) throw dbError

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } })
      setIsAddModalOpen(false)
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setPreviewUrl(null)
      fetchMemories()
    } catch (err) {
      console.error('Error adding memory:', err)
      setError(err.message || 'Could not save this memory.')
    } finally {
      setIsUploading(false)
    }
  }

  const toggleFavorite = async (memoryId, currentFav) => {
    if (!supabase || !memoryId) return
    try {
      const nextFav = !currentFav
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, is_favorite: nextFav } : m))
      )
      if (nextFav) {
        confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 } })
      }
      await supabase.from('memories').update({ is_favorite: nextFav }).eq('id', memoryId)
    } catch (err) {
      console.warn('Error toggling memory favorite:', err)
    }
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 pb-20 space-y-4">
      {/* Top Header */}
      <div className="glass rounded-3xl p-5 flex items-center justify-between border border-rose-200/60 dark:border-rose-900/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Our Memories 📸</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Capturing our most precious moments together.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="py-2 px-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Moment</span>
        </button>
      </div>

      {/* Memories Grid */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : memories.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-slate-400 border border-rose-200/50 dark:border-rose-900/30">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 mx-auto mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No memories yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
            Tap "Add Moment" to save your first photograph and date milestone in your shared vault!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((m) => (
            <div
              key={m.id}
              className="glass rounded-3xl overflow-hidden border border-rose-100 dark:border-rose-900/40 shadow-sm hover:shadow-md transition group relative flex flex-col"
            >
              {/* Image Thumbnail */}
              <div
                onClick={() =>
                  setActiveLightbox({
                    url: m.media_url,
                    type: 'image',
                    name: m.title,
                  })
                }
                className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer relative"
              >
                <img
                  src={m.media_url}
                  alt={m.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Favorite Heart Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(m.id, m.is_favorite)
                  }}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition ${
                    m.is_favorite
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-black/40 text-white/80 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${m.is_favorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Memory Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 dark:text-rose-400 font-semibold mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(m.memory_date), 'MMMM d, yyyy')}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{m.title}</h4>
                  {m.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-midnight-900 border border-rose-200 dark:border-rose-900/40 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Add a Romantic Memory 📸
            </h3>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs">{error}</div>
            )}

            <form onSubmit={handleAddMemory} className="space-y-4">
              {/* Photo selector */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {previewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video w-full rounded-2xl overflow-hidden cursor-pointer relative group border border-rose-200 dark:border-rose-800"
                  >
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                      Change Photo
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-800 hover:border-rose-400 bg-rose-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-500 hover:text-rose-500 transition"
                  >
                    <Upload className="w-6 h-6 mb-1 text-rose-400" />
                    <span className="text-xs font-medium">Select a special photo</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Our First Trip to the Beach"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={memoryDate}
                  onChange={(e) => setMemoryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Story / Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What made this moment unforgettable..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-rose-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Moment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for memories */}
      <MediaLightbox media={activeLightbox} onClose={() => setActiveLightbox(null)} />
    </div>
  )
}
