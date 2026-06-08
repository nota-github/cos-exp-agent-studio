import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

const SETTING_LABELS: Record<string, string> = {
  cli_path: 'CLI 도구 경로',
  api_key: 'API 키',
}

const MAX_ROWS = 4
const LINE_HEIGHT_PX = 20

interface Props {
  onSubmit: (text: string) => Promise<void>
  onStop: () => Promise<void>
  canStop: boolean
  isSubmitting: boolean
  missingSettings: string[] | null
  prefillText?: string
  prefillKey?: number
}

export default function InputBar({ onSubmit, onStop, canStop, isSubmitting, missingSettings, prefillText, prefillKey }: Props) {
  const [value, setValue] = useState('')
  const [stopping, setStopping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const disabled = canStop || isSubmitting

  const resize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    const maxHeight = LINE_HEIGHT_PX * MAX_ROWS + 16
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    if (!prefillKey) return
    const text = prefillText ?? ''
    setValue(text)
    if (textareaRef.current) {
      textareaRef.current.value = text
      resize(textareaRef.current)
      textareaRef.current.focus()
    }
  }, [prefillKey, prefillText, resize])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      resize(e.target)
    },
    [resize]
  )

  const resetTextarea = useCallback(() => {
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const text = value.trim()
        if (!text || disabled) return
        resetTextarea()
        void onSubmit(text)
      }
    },
    [value, disabled, onSubmit, resetTextarea]
  )

  const handleSubmitClick = useCallback(() => {
    const text = value.trim()
    if (!text || disabled) return
    resetTextarea()
    void onSubmit(text)
  }, [value, disabled, onSubmit, resetTextarea])

  const handleStop = useCallback(async () => {
    if (stopping) return
    setStopping(true)
    try {
      await onStop()
    } finally {
      setTimeout(() => setStopping(false), 1000)
    }
  }, [stopping, onStop])

  return (
    <div className="flex-shrink-0">
      {missingSettings && missingSettings.length > 0 && (
        <div className="px-6 py-2 bg-amber-950/40 border-t border-amber-800/30">
          <p className="text-xs text-amber-400">
            실행 전에{' '}
            <span className="font-medium">
              {missingSettings.map((f) => SETTING_LABELS[f] ?? f).join(', ')}
            </span>{' '}
            설정이 필요합니다.{' '}
            <Link to="/settings" className="underline hover:text-amber-300 transition-colors">
              설정 화면으로 이동
            </Link>
          </p>
        </div>
      )}

      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="작업 요청을 입력하세요..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-gray-900 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            style={{ minHeight: '36px', lineHeight: `${LINE_HEIGHT_PX}px` }}
          />

          {canStop ? (
            <button
              onClick={() => void handleStop()}
              disabled={stopping}
              className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
            >
              중단
            </button>
          ) : (
            <button
              onClick={handleSubmitClick}
              disabled={!value.trim() || isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
            >
              작업 실행
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
