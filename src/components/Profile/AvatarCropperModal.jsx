import React, { useState, useRef, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  X,
  Camera,
  Crop,
  Sparkles,
  Move,
} from 'lucide-react'

export const AvatarCropperModal = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  isSaving = false,
}) => {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [imageElement, setImageElement] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef(null)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Load the raw image into an HTMLImageElement
  useEffect(() => {
    if (!imageSrc) {
      setImageElement(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImageElement(img)
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setRotation(0)
    }
    img.src = imageSrc
  }, [imageSrc])

  // Render crop preview on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageElement) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    // 1. Draw transformed image
    ctx.save()
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y)
    ctx.rotate((rotation * Math.PI) / 180)

    // Fit image nicely into canvas dimensions
    const baseScale = Math.max(width / imageElement.width, height / imageElement.height)
    const effectiveScale = baseScale * zoom
    ctx.scale(effectiveScale, effectiveScale)

    const imgW = imageElement.width
    const imgH = imageElement.height
    ctx.drawImage(imageElement, -imgW / 2, -imgH / 2, imgW, imgH)
    ctx.restore()

    // 2. Draw circular darkening mask
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)'
    ctx.beginPath()
    ctx.rect(0, 0, width, height)
    const radius = width / 2 - 12
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2, true)
    ctx.fill()

    // 3. Draw romantic glowing crop ring
    ctx.lineWidth = 3
    ctx.strokeStyle = '#f43f5e'
    ctx.shadowColor = 'rgba(244, 63, 94, 0.5)'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }, [imageElement, zoom, pan, rotation])

  // Mouse & Touch Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      }
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return
    setPan({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    })
  }

  const handleTouchEnd = () => setIsDragging(false)

  // Export cropped 400x400 JPEG image
  const handleSaveCrop = () => {
    if (!imageElement || !canvasRef.current) return

    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = 400
    outputCanvas.height = 400
    const ctx = outputCanvas.getContext('2d')

    const previewW = canvasRef.current.width
    const previewRadius = previewW / 2 - 12
    const scaleRatio = 200 / previewRadius

    ctx.save()
    // Clip circular output
    ctx.beginPath()
    ctx.arc(200, 200, 200, 0, Math.PI * 2)
    ctx.clip()

    // Background fill
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 400)

    // Translate to center
    ctx.translate(200 + pan.x * scaleRatio, 200 + pan.y * scaleRatio)
    ctx.rotate((rotation * Math.PI) / 180)

    const baseScale = Math.max(previewW / imageElement.width, previewW / imageElement.height)
    const effectiveScale = baseScale * zoom * scaleRatio
    ctx.scale(effectiveScale, effectiveScale)

    const imgW = imageElement.width
    const imgH = imageElement.height
    ctx.drawImage(imageElement, -imgW / 2, -imgH / 2, imgW, imgH)
    ctx.restore()

    const croppedDataUrl = outputCanvas.toDataURL('image/jpeg', 0.86)
    onCropComplete(croppedDataUrl)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-midnight-900 border border-rose-200/60 dark:border-rose-900/40 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-sm">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Crop Profile Picture
              </h3>
              <p className="text-[11px] text-slate-400">Drag to center & zoom to scale</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Canvas Viewport */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative rounded-2xl overflow-hidden border border-rose-100 dark:border-slate-800 shadow-inner bg-slate-950 select-none">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="cursor-move touch-none"
            />
            <div className="absolute bottom-2 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-slate-300 pointer-events-none flex items-center gap-1">
              <Move className="w-3 h-3 text-rose-400" />
              <span>Drag to move</span>
            </div>
          </div>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="space-y-3 pt-1">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <ZoomOut className="w-4 h-4" />
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-rose-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <ZoomIn className="w-4 h-4" />
          </div>

          {/* Rotate & Reset Action buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 transition active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5 text-rose-500" />
              <span>Rotate</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setPan({ x: 0, y: 0 })
                setRotation(0)
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs text-slate-400 font-medium transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-2 pt-2 border-t border-rose-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isSaving || !imageElement}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white text-xs font-semibold shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Picture</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
