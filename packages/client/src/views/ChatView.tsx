import { useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useProjects } from '../api/projects'
import { apiDelete } from '../api/client'
import ExecutionStatusBadge from '../components/ExecutionStatusBadge'
import { useExecutionStatus } from '../hooks/useExecutionStatus'

export default function ChatView() {
  const { id: projectId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const { data: projects } = useProjects()
  const project = projects?.find((p) => p.id === projectId)

  const currentExecutionId = useAppStore((s) => s.currentExecutionId)
  // URL param allows testing before story-6.3 wires task submission via Zustand
  const executionId = currentExecutionId ?? searchParams.get('executionId')

  const status = useExecutionStatus(executionId)

  const [stopping, setStopping] = useState(false)

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
      <aside className="w-64 border-r border-gray-800 flex-shrink-0 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <span className="text-sm font-semibold text-gray-300">프로젝트</span>
        </div>
        <div className="flex-1" />
        <div className="px-4 py-3 border-t border-gray-800">
          <span className="text-xs text-gray-600">설정</span>
        </div>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-100">
              {project?.name ?? '로딩 중...'}
            </span>
            <ExecutionStatusBadge status={status} />
          </div>
          {canStop && (
            <button
              onClick={handleStop}
              disabled={stopping}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md transition-colors"
            >
              실행 중단
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">채팅 메시지가 여기에 표시됩니다.</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-800">
          <div className="w-full h-10 bg-gray-900 rounded-lg border border-gray-700" />
        </div>
      </div>
    </div>
  )
}
