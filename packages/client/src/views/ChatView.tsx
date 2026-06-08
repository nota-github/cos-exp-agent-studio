import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../stores/appStore'
import { useProjects } from '../api/projects'
import { apiDelete } from '../api/client'
import { createExecution } from '../api/executions'
import ExecutionStatusBadge from '../components/ExecutionStatusBadge'
import LogPanel from '../components/LogPanel'
import Sidebar from '../components/Sidebar'
import MessageBubble from '../components/MessageBubble'
import InputBar from '../components/InputBar'
import { useExecutionStatus } from '../hooks/useExecutionStatus'
import { useMessages, messagesQueryKey } from '../api/messages'
import type { ChatMessage } from '../api/messages'
import { useWsMessage } from '../hooks/useWebSocket'

export default function ChatView() {
  const { id: projectId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const { data: projects } = useProjects()
  const project = projects?.find((p) => p.id === projectId)

  const currentExecutionId = useAppStore((s) => s.currentExecutionId)
  const setCurrentExecutionId = useAppStore((s) => s.setCurrentExecutionId)
  const logPanelOpen = useAppStore((s) => s.logPanelOpen)
  const setLogPanelOpen = useAppStore((s) => s.setLogPanelOpen)

  // URL param allows testing execution status without a full submit flow
  const executionId = currentExecutionId ?? searchParams.get('executionId')

  const status = useExecutionStatus(executionId)
  const { data: messages, isLoading: messagesLoading } = useMessages(projectId)

  const bottomRef = useRef<HTMLDivElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [missingSettings, setMissingSettings] = useState<string[] | null>(null)
  const [editState, setEditState] = useState<{ text: string; key: number } | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useWsMessage((msg) => {
    if (msg.type === 'execution_complete' && typeof msg.executionId === 'string') {
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(projectId) })
      }
    }

    if (msg.type === 'approval_request' && typeof msg.executionId === 'string' && projectId) {
      const approval = msg.approval as {
        id: string
        action_type: string
        target: string
        risk_level: 'low' | 'medium' | 'high'
        description: string
        requested_at: string
      }
      const wsMessageId = `ws-approval-${approval.id}`
      queryClient.setQueryData<ChatMessage[]>(messagesQueryKey(projectId), (old) => {
        const existing = old ?? []
        if (existing.some((m) => m.id === wsMessageId || (m.type === 'approval_request' && m.metadata?.includes(approval.id)))) {
          return existing
        }
        return [
          ...existing,
          {
            id: wsMessageId,
            execution_id: msg.executionId as string,
            project_id: projectId,
            type: 'approval_request' as const,
            content: approval.description,
            metadata: JSON.stringify({
              approvalId: approval.id,
              action_type: approval.action_type,
              target: approval.target,
              risk_level: approval.risk_level,
            }),
            created_at: approval.requested_at,
          },
        ]
      })
    }
  })

  const canStop = status === 'running' || status === 'approval_pending'
  const canRerun = !canStop && !submitting

  const handleEditRerun = useCallback((text: string) => {
    setEditState((prev) => ({ text, key: (prev?.key ?? 0) + 1 }))
  }, [])

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!projectId || submitting) return
      setMissingSettings(null)
      setSubmitting(true)

      // Optimistic: show user message immediately before server round-trip
      queryClient.setQueryData<ChatMessage[]>(messagesQueryKey(projectId), (old) => [
        ...(old ?? []),
        {
          id: `optimistic-${Date.now()}`,
          execution_id: '',
          project_id: projectId,
          type: 'user' as const,
          content: text,
          metadata: null,
          created_at: new Date().toISOString(),
        },
      ])

      try {
        const result = await createExecution(projectId, text)
        if (!result.ok) {
          if (result.error.type === 'missing_settings') {
            setMissingSettings(result.error.missing)
          }
          // Roll back optimistic message on error
          void queryClient.invalidateQueries({ queryKey: messagesQueryKey(projectId) })
          return
        }
        setCurrentExecutionId(result.executionId)
        // Replace optimistic message with server-confirmed message
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(projectId) })
      } catch {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(projectId) })
      } finally {
        setSubmitting(false)
      }
    },
    [projectId, submitting, queryClient, setCurrentExecutionId]
  )

  const handleStop = useCallback(async () => {
    if (!executionId) return
    try {
      await apiDelete(`/executions/${executionId}`)
    } catch {
      // Status transition arrives via WebSocket regardless
    }
  }, [executionId])

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
          <button
            onClick={() => setLogPanelOpen(!logPanelOpen)}
            className="px-3 py-1.5 text-xs font-medium border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 rounded-md transition-colors"
          >
            {logPanelOpen ? '로그 닫기' : '로그 보기'}
          </button>
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
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRerun={msg.type === 'user' ? () => void handleSubmit(msg.content) : undefined}
                  onEditRerun={msg.type === 'user' ? handleEditRerun : undefined}
                  canRerun={canRerun}
                />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <InputBar
          onSubmit={handleSubmit}
          onStop={handleStop}
          canStop={canStop}
          isSubmitting={submitting}
          missingSettings={missingSettings}
          prefillText={editState?.text}
          prefillKey={editState?.key}
        />

        <LogPanel executionId={executionId} open={logPanelOpen} />
      </div>
    </div>
  )
}
