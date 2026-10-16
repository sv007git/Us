import React from 'react'
import { X, Download, ExternalLink, Film, Image as ImageIcon } from 'lucide-react'

export const MediaLightbox = ({ media, onClose }) => {
  if (!media) return null

  const { url, type, name, size } = media
  const isVideo = type === 'video' || (url && url.match(/\.(mp4|webm|mov)(\?|$)/i))

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${Math.round(bytes / 1024)} KB`
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between text-white pb-3 px-2">
          <div className="flex items-center space-x-2 truncate pr-4">
            {isVideo ? <Film className="w-4 h-4 text-rose-400" /> : <ImageIcon className="w-4 h-4 text-rose-400" />}
            <span className="text-xs sm:text-sm font-medium truncate">{name || 'Shared Media'}</span>
            {size && <span className="text-xs text-slate-400">({formatFileSize(size)})</span>}
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={url}
              download={name || 'media'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center gap-1.5"
              title="Download file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10">
          {isVideo ? (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
          ) : (
            <img
              src={url}
              alt={name || 'Shared photo'}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl select-none"
            />
          )}
        </div>
      </div>
    </div>
  )
}
