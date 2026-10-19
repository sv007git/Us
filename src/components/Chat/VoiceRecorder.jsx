import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export const getSupportedAudioMimeType = () => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return ''
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ]
  for (const t of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t
    }
  }
  return ''
}

export const VoiceRecorder = ({ onSendAudio, onCancel }) => {
  const { currentTheme } = useTheme()
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const previewAudioRef = useRef(null)

  const startRecording = async () => {
    setError(null)
    setRecordedBlob(null)
    setAudioUrl(null)
    setDuration(0)
    audioChunksRef.current = []

    const mimeType = getSupportedAudioMimeType()
    if (!mimeType) {
      setError('Voice recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }

      recorder.start(100) // 100ms slices
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission was denied. Please allow microphone access in your browser site settings.')
      } else {
        setError('Could not access microphone: ' + err.message)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    stopRecording()
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setRecordedBlob(null)
    setAudioUrl(null)
    setDuration(0)
    onCancel?.()
  }

  const handleSend = () => {
    if (!recordedBlob) return
    const mimeType = recordedBlob.type || 'audio/webm'
    const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const audioFile = new File([recordedBlob], `voice_note_${Date.now()}.${extension}`, {
      type: mimeType,
    })

    onSendAudio({
      file: audioFile,
      duration,
    })

    cancelRecording()
  }

  const togglePreview = () => {
    if (!previewAudioRef.current) return
    if (isPlayingPreview) {
      previewAudioRef.current.pause()
      setIsPlayingPreview(false)
    } else {
      previewAudioRef.current.play()
      setIsPlayingPreview(true)
    }
  }

  // Auto-start recording on mount
  useEffect(() => {
    startRecording()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div className={`p-3 ${currentTheme.softBg} border ${currentTheme.border} rounded-2xl flex flex-col gap-2 animate-fade-in`}>
      {error ? (
        <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={cancelRecording}
            className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-[11px] font-semibold"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          {/* Delete / Cancel button */}
          <button
            type="button"
            onClick={cancelRecording}
            className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition"
            title="Cancel recording"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Recording / Playback status visualization */}
          <div className="flex-1 flex items-center gap-3">
            {isRecording ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                    {formatTimer(duration)}
                  </span>
                </div>

                {/* Animated sound wave bars */}
                <div className="flex items-center gap-1 h-6 flex-1 max-w-[140px]">
                  {[40, 80, 60, 100, 70, 90, 50, 75, 95, 60].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 ${currentTheme.accent} rounded-full animate-pulse`}
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              /* Recorded preview */
              audioUrl && (
                <div className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePreview}
                    className={`p-1.5 rounded-full ${currentTheme.buttonGrad} text-white transition active:scale-95`}
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    Voice Note ({formatTimer(duration)})
                  </span>
                  <audio
                    ref={previewAudioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlayingPreview(false)}
                    className="hidden"
                  />
                </div>
              )
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                title="Stop recording"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={isRecording ? () => { stopRecording(); setTimeout(handleSend, 150); } : handleSend}
              className={`p-2 rounded-full ${currentTheme.buttonGrad} text-white shadow-md ${currentTheme.shadow} hover:opacity-95 transition active:scale-95`}
              title="Send voice note"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
