import React, { useState, useEffect } from 'react'
import { Search, Sparkles, X, Heart, Smile } from 'lucide-react'

// Built-in curated collection of animated romantic stickers and GIFs
// Guarantees immediate zero-config functionality out of the box!
const CURATED_ROMANTIC_STICKERS = [
  {
    category: 'Love & Hugs',
    items: [
      { id: 'hug1', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=320&auto=format&fit=crop&q=80', label: 'Forever Love' },
      { id: 'hug2', url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=320&auto=format&fit=crop&q=80', label: 'Holding Hands' },
      { id: 'hug3', url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=320&auto=format&fit=crop&q=80', label: 'Warm Embrace' },
    ],
  },
  {
    category: 'Sweet Moments',
    items: [
      { id: 'moment1', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=320&auto=format&fit=crop&q=80', label: 'Starlight Romance' },
      { id: 'moment2', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=320&auto=format&fit=crop&q=80', label: 'Blushing Rose' },
      { id: 'moment3', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=320&auto=format&fit=crop&q=80', label: 'Sweet Sunset' },
    ],
  },
]

// Animated stickers (SVG-based / emoji badges for instant zero-latency sending)
const ANIMATED_STICKERS = [
  { id: 's1', emoji: '💖', title: 'Sparkling Heart', label: 'My whole heart' },
  { id: 's2', emoji: '🥰', title: 'Adoration', label: 'Head over heels' },
  { id: 's3', emoji: '😘', title: 'Blowing Kiss', label: 'Sending kisses' },
  { id: 's4', emoji: '🫂', title: 'Warm Hug', label: 'Big tight hug' },
  { id: 's5', emoji: '🌹', title: 'Rose', label: 'Just for you' },
  { id: 's6', emoji: '💍', title: 'Promise', label: 'Forever & always' },
  { id: 's7', emoji: '🧸', title: 'Teddy Bear', label: 'Cuddle time' },
  { id: 's8', emoji: '✨', title: 'Magic', label: 'You are magic' },
  { id: 's9', emoji: '💌', title: 'Love Letter', label: 'Love note' },
  { id: 's10', emoji: '👩‍❤️‍👨', title: 'Together', label: 'Us forever' },
  { id: 's11', emoji: '💋', title: 'Sweet Kiss', label: 'Kiss me' },
  { id: 's12', emoji: '🍫', title: 'Chocolate', label: 'Sweet like you' },
]

export const GifPicker = ({ isOpen, onClose, onSelectMedia }) => {
  const [tab, setTab] = useState('stickers') // 'stickers', 'gifs'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedGifs, setSearchedGifs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiNotice, setApiNotice] = useState(null)

  const tenorKey = import.meta.env.VITE_TENOR_API_KEY || ''
  const giphyKey = import.meta.env.VITE_GIPHY_API_KEY || ''

  const searchTenorGifs = async (query) => {
    if (!tenorKey && !giphyKey) {
      setApiNotice('External search requires a free Tenor or GIPHY key in .env. Showing our romantic collection!')
      return
    }

    setIsLoading(true)
    setApiNotice(null)
    try {
      if (tenorKey) {
        const res = await fetch(
          `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(
            query || 'romantic couple love'
          )}&key=${tenorKey}&limit=16&media_filter=gif,tinygif`
        )
        const data = await res.json()
        if (data.results) {
          const list = data.results.map((r) => ({
            id: r.id,
            url: r.media_formats.tinygif?.url || r.media_formats.gif?.url,
            title: r.content_description || 'Romantic GIF',
          }))
          setSearchedGifs(list)
        }
      } else if (giphyKey) {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${giphyKey}&q=${encodeURIComponent(
            query || 'romantic couple'
          )}&limit=16&rating=g`
        )
        const data = await res.json()
        if (data.data) {
          const list = data.data.map((r) => ({
            id: r.id,
            url: r.images.fixed_height_small?.url || r.images.original?.url,
            title: r.title || 'Romantic GIF',
          }))
          setSearchedGifs(list)
        }
      }
    } catch (e) {
      console.warn('GIF search error:', e)
      setApiNotice('Could not load online GIFs. Using romantic sticker collection.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'gifs' && (tenorKey || giphyKey)) {
      searchTenorGifs(searchQuery)
    }
  }, [tab])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-midnight-900 border-t sm:border border-rose-200 dark:border-rose-900/40 rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl flex flex-col h-[70vh] sm:h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Stickers & GIFs 💌
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-rose-50 dark:bg-slate-800/80 rounded-xl my-3">
          <button
            type="button"
            onClick={() => setTab('stickers')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              tab === 'stickers'
                ? 'bg-white dark:bg-midnight-800 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Romantic Stickers
          </button>
          <button
            type="button"
            onClick={() => setTab('gifs')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              tab === 'gifs'
                ? 'bg-white dark:bg-midnight-800 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            GIF Search
          </button>
        </div>

        {/* Tab 1: Stickers */}
        {tab === 'stickers' ? (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Sweet Love Badges
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {ANIMATED_STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => {
                      onSelectMedia({
                        type: 'sticker',
                        content: sticker.emoji,
                        metadata: { label: sticker.label, title: sticker.title },
                      })
                      onClose()
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50/50 dark:bg-slate-800/50 hover:bg-rose-100/70 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-slate-800 active:scale-95 transition group"
                  >
                    <span className="text-3xl filter drop-shadow-sm group-hover:scale-125 transition-transform duration-200">
                      {sticker.emoji}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 truncate max-w-full text-center">
                      {sticker.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {CURATED_ROMANTIC_STICKERS.map((cat, idx) => (
              <div key={idx}>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  {cat.category}
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectMedia({
                          type: 'gif',
                          mediaUrl: item.url,
                          metadata: { title: item.label },
                        })
                        onClose()
                      }}
                      className="group relative rounded-xl overflow-hidden aspect-square border border-rose-100 dark:border-slate-800 active:scale-95 transition"
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                      <span className="absolute inset-x-0 bottom-0 p-1 bg-black/60 text-white text-[9px] text-center truncate">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tab 2: Online GIF Search */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchTenorGifs(searchQuery)}
                placeholder="Search love, hugs, kisses..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {apiNotice && (
              <p className="text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg mb-2">
                {apiNotice}
              </p>
            )}

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchedGifs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {searchedGifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => {
                        onSelectMedia({
                          type: 'gif',
                          mediaUrl: gif.url,
                          metadata: { title: gif.title },
                        })
                        onClose()
                      }}
                      className="rounded-xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-800 active:scale-95 transition hover:opacity-90"
                    >
                      <img
                        src={gif.url}
                        alt={gif.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <Heart className="w-8 h-8 text-rose-300 mb-2 stroke-1" />
                  <p className="text-xs">
                    {tenorKey || giphyKey
                      ? 'Type a keyword above to find lovely GIFs!'
                      : 'Configure Tenor or GIPHY key in .env or switch to the Stickers tab!'}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 text-center text-[10px] text-slate-400">
              Powered by Tenor & Giphy • Curated with love
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
