import { useParams, useNavigate } from 'react-router-dom'
import { useProjectExecutions, type Execution } from '../api/executions'
import ExecutionStatusBadge from '../components/ExecutionStatusBadge'
import Sidebar from '../components/Sidebar'
import type { ExecutionStatus } from '../stores/appStore'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`
  } catch {
    return iso.slice(0, 16)
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}m ${secs}s`
}

interface ExecutionRowProps {
  execution: Execution
  onClick: () => void
}

function ExecutionRow({ execution, onClick }: ExecutionRowProps) {
  const isFailed = execution.status === 'failed'
  const truncated =
    execution.request_text.length > 80
      ? execution.request_text.slice(0, 80) + '…'
      : execution.request_text

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors border border-gray-800 ${
        isFailed ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-200 leading-snug flex-1 min-w-0 truncate">{truncated}</p>
        <ExecutionStatusBadge status={execution.status as ExecutionStatus} />
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
        <span>{formatDate(execution.started_at)}</span>
        {execution.duration_ms !== null && (
          <>
            <span>·</span>
            <span>{formatDuration(execution.duration_ms)}</span>
          </>
        )}
      </div>
    </button>
  )
}

export default function ExecutionHistoryView() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: executions, isLoading } = useProjectExecutions(projectId)

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar activeProjectId={projectId} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => navigate(`/projects/${projectId}/chat`)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="채팅으로 돌아가기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-100">실행 기록</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-600 text-sm">불러오는 중...</p>
            </div>
          )}

          {!isLoading && (!executions || executions.length === 0) && (
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">아직 실행 기록이 없습니다</p>
              <p className="text-gray-600 text-xs mt-1">채팅창에서 작업을 요청해보세요</p>
            </div>
          )}

          {!isLoading && executions && executions.length > 0 && (
            <div className="max-w-3xl mx-auto px-6 py-4 space-y-1.5">
              {executions.map((exec) => (
                <ExecutionRow
                  key={exec.id}
                  execution={exec}
                  onClick={() => navigate(`/executions/${exec.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
