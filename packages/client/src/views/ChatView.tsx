import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../stores/appStore'
import { useProjects } from '../api/projects'
import { apiDelete } from '../api/client'
import ExecutionStatusBadge from '../components/ExecutionStatusBadge'
import LogPanel from '../components/LogPanel'
import Sidebar from '../components/Sidebar'
import MessageBubble from '../components/MessageBubble'
import { useExecutionStatus } from '../hooks/useExecutionStatus'
import { useMessages, messagesQueryKey } from '../api/messages'
import { useWsMessage } from '../hooks/useWebSocket'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

const SETTING_LABELS: Record<string, string> = {
  cli_path: 'CLI 도구 경로',
  api_key: 'API 키',
}

export default function ChatView() {
  const { id: projectId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const { data: projects } = useProjects()
  const project = projects?.find((p) => p.id === projectId)

  const currentExecutionId = useAppStore((s) => s.currentExecutionId)
  const logPanelOpen = useAppStore((s) => s.logPanelOpen)
  const setLogPanelOpen = useAppStore((s) => s.setLogPanelOpen)
  // URL param allows testing before story-6.3 wires task submission via Zustand
  const executionId = currentExecutionId ?? searchParams.get('executionId')

  const status = useExecutionStatus(executionId)
  const { data: messages, isLoading: messagesLoading } = useMessages(projectId)

  const bottomRef = useRef<HTMLDivElement>(null)

  const [stopping, setStopping] = useState(false)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [missingSettings, setMissingSettings] = useState<string[] | null>(null)

  // Auto-scroll to newest message on load and new arrivals
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // On execution_complete, refetch messages so agent/system message appears
  useWsMessage((msg) => {
    if (msg.type === 'execution_complete' && typeof msg.executionId === 'string') {
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(projectId) })
      }
    }
  })

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || !projectId || submitting) return
    setMissingSettings(null)
    setSubmitting(true)
    try {
      const res = await fetch(`${BASE_URL}/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, requestText: input.trim() }),
      })
      if (res.status === 400) {
        const body = await res.json() as { error: string; missing?: string[] }
        if (body.missing && body.missing.length > 0) {
          setMissingSettings(body.missing)
          return
        }
      }
      if (res.ok) {
        setInput('')
        // Refetch messages to show the user message immediately
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(projectId) })
      }
    } catch {
      // Network error — silent
    } finally {
      setSubmitting(false)
    }
  }, [input, projectId, submitting, queryClient])

  const handleStop = useCallback(async () => {
    if (!executionId || stopping) return
    setStopping(true)
    try {
      await apiDelete(`/executions/${executionId}`)
    } catch {
      // Status transition arrives via WebSocket regardless
    } finally {
      setTimeout(() => setStopping(false), 1000)
    }
  }, [executionId, stopping])

  const canStop = status === 'running' || status === 'approval_pending'

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar activeProjectId={projectId} />

      <div className="relative flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-100">
              {project?.name ?? '로딩 중...'}
            </span>
            <ExecutionStatusBadge status={status} />
          </div>
          <div className="flex items-center gap-2">
            {canStop && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                실행 중단
              </button>
            )}
            <button
              onClick={() => setLogPanelOpen(!logPanelOpen)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 rounded-md transition-colors"
            >
              {logPanelOpen ? '로그 닫기' : '로그 보기'}
            </button>
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto py-4">
          {messagesLoading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-600 text-sm">메시지를 불러오는 중...</p>
            </div>
          )}

          {!messagesLoading && messages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">아직 대화 내역이 없습니다</p>
              <p className="text-gray-600 text-xs mt-1">아래 입력창에 작업을 요청해 보세요</p>
            </div>
          )}

          {!messagesLoading && messages && messages.length > 0 && (
            <div className="space-y-1">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Missing settings warning */}
        {missingSettings && missingSettings.length > 0 && (
          <div className="px-6 py-2 bg-amber-950/40 border-t border-amber-800/30 flex-shrink-0">
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

        {/* Input bar */}
        <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
              className="flex-1 bg-gray-900 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-gray-500 transition-colors"
              rows={1}
              placeholder="작업 요청을 입력하세요..."
              disabled={submitting}
            />
            <button
              onClick={() => void handleSubmit()}
              disabled={!input.trim() || submitting}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              전송
            </button>
          </div>
        </div>

        <LogPanel executionId={executionId} open={logPanelOpen} />
      </div>
    </div>
  )
}
