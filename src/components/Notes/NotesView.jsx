import React, { useState, useEffect } from 'react'
import {
  HeartHandshake,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Heart,
  Cake,
  Droplets,
  BookOpen,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useCouple } from '../../context/CoupleContext'
import { BirthdayCalculator } from './BirthdayCalculator'
import { CycleCalculator } from './CycleCalculator'
import confetti from 'canvas-confetti'

const NOTE_COLORS = {
  rose: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-100',
  lavender: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/50 text-purple-950 dark:text-purple-100',
  blush: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900/50 text-pink-950 dark:text-pink-100',
  amber: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-100',
}

export const NotesView = () => {
  const { user } = useAuth()
  const { coupleSpace, partner } = useCouple()

  const [activeTab, setActiveTab] = useState('notes') // 'notes', 'birthdays', 'cycle'
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState('rose')
  const [isPinned, setIsPinned] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)

  const fetchNotes = async () => {
    if (!supabase || !coupleSpace?.id) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('love_notes')
        .select('*')
        .eq('couple_space_id', coupleSpace.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (err) {
      console.error('Error fetching love notes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [coupleSpace?.id])

  const handleSaveNote = async (e) => {
    e.preventDefault()
    if (!content.trim() || !coupleSpace || !user) return

    try {
      if (editingNoteId) {
        const { error } = await supabase
          .from('love_notes')
          .update({
            title: title.trim() || null,
            content: content.trim(),
            color,
            is_pinned: isPinned,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNoteId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('love_notes').insert({
          couple_space_id: coupleSpace.id,
          author_id: user.id,
          title: title.trim() || null,
          content: content.trim(),
          color,
          is_pinned: isPinned,
        })

        if (error) throw error
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } })
      }

      setIsCreating(false)
      setEditingNoteId(null)
      setTitle('')
      setContent('')
      setColor('rose')
      setIsPinned(false)
      fetchNotes()
    } catch (err) {
      console.error('Error saving note:', err)
    }
  }

  const handleDeleteNote = async (id) => {
    if (!supabase || !id) return
    try {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      await supabase.from('love_notes').delete().eq('id', id)
    } catch (err) {
      console.error('Error deleting note:', err)
      fetchNotes()
    }
  }

  const togglePin = async (id, currentPinned) => {
    try {
      const nextPinned = !currentPinned
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_pinned: nextPinned } : n))
      )
      await supabase.from('love_notes').update({ is_pinned: nextPinned }).eq('id', id)
    } catch (err) {
      console.error('Error toggling pin:', err)
      fetchNotes()
    }
  }

  const startEdit = (note) => {
    setEditingNoteId(note.id)
    setTitle(note.title || '')
    setContent(note.content || '')
    setColor(note.color || 'rose')
    setIsPinned(Boolean(note.is_pinned))
    setIsCreating(true)
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 pb-20 space-y-4">
      {/* Top Header */}
      <div className="glass rounded-3xl p-5 flex items-center justify-between border border-rose-200/60 dark:border-rose-900/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
            {activeTab === 'birthdays' ? (
              <Cake className="w-5 h-5" />
            ) : activeTab === 'cycle' ? (
              <Droplets className="w-5 h-5" />
            ) : (
              <HeartHandshake className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {activeTab === 'birthdays'
                ? 'Couples Birthday & Age Calculator 🎂'
                : activeTab === 'cycle'
                ? 'Cycle & Ovulation Hub 🌸'
                : 'Love Notes & Bucket List 💌'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === 'birthdays'
                ? 'Track your exact ages, upcoming birthday countdowns, and zodiac harmony.'
                : activeTab === 'cycle'
                ? 'Her cycle phases, ovulation window, and romantic care recommendations.'
                : 'Shared romantic thoughts, letters, and adventures to check off together.'}
            </p>
          </div>
        </div>

        {activeTab === 'notes' && (
          <button
            onClick={() => {
              setEditingNoteId(null)
              setTitle('')
              setContent('')
              setIsCreating(true)
            }}
            className="py-2 px-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex p-1 bg-rose-100/60 dark:bg-slate-800/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'notes'
              ? 'bg-white dark:bg-midnight-800 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Love Notes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('birthdays')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'birthdays'
              ? 'bg-white dark:bg-midnight-800 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Cake className="w-3.5 h-3.5" />
          <span>Birthday & Age</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cycle')}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
            activeTab === 'cycle'
              ? 'bg-white dark:bg-midnight-800 text-rose-600 dark:text-rose-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Cycle & Ovulation</span>
        </button>
      </div>

      {/* Tab View Content */}
      {activeTab === 'birthdays' && <BirthdayCalculator />}
      {activeTab === 'cycle' && <CycleCalculator />}

      {activeTab === 'notes' && (
        <>
          {/* Create / Edit Note Form */}
      {isCreating && (
        <form
          onSubmit={handleSaveNote}
          className="glass rounded-3xl p-5 border border-rose-300 dark:border-rose-800 shadow-xl space-y-3.5 animate-scale-up"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500" />
              {editingNoteId ? 'Edit Love Note' : 'Write a Love Note'}
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Next Summer Vacation, Things I Love About You)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
          />

          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note, romantic letter, or bucket list item..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Color Palette Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-slate-400">Color:</span>
              {Object.keys(NOTE_COLORS).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    c === 'rose'
                      ? 'bg-rose-300'
                      : c === 'lavender'
                      ? 'bg-purple-300'
                      : c === 'blush'
                      ? 'bg-pink-300'
                      : 'bg-amber-300'
                  } ${color === c ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`}
                />
              ))}
            </div>

            {/* Pin to top */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded accent-rose-500"
              />
              <Pin className="w-3.5 h-3.5 text-rose-500" /> Pin to top
            </label>

            {/* Save button */}
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-500/20 active:scale-95 transition"
            >
              Save Note
            </button>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-slate-400 border border-rose-200/50 dark:border-rose-900/30">
          <Heart className="w-12 h-12 text-rose-400 mx-auto mb-3 stroke-1" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No notes written yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
            Leave a sweet surprise note or start your couples bucket list together!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {notes.map((note) => {
            const colorClass = NOTE_COLORS[note.color] || NOTE_COLORS.rose
            return (
              <div
                key={note.id}
                className={`rounded-3xl p-5 border shadow-sm transition hover:shadow-md relative flex flex-col justify-between ${colorClass}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-sm truncate">{note.title || 'Love Note'}</h4>
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => togglePin(note.id, note.is_pinned)}
                        className={`p-1 rounded-full transition ${
                          note.is_pinned ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title={note.is_pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1 rounded-full text-slate-400 hover:text-blue-600 transition"
                        title="Edit note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded-full text-slate-400 hover:text-red-600 transition"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs whitespace-pre-wrap leading-relaxed opacity-90">{note.content}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] opacity-70">
                  <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                  <span>{note.author_id === user?.id ? 'Written by You' : `From ${partner?.display_name || 'Love'}`}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )}
</div>
  )
}
