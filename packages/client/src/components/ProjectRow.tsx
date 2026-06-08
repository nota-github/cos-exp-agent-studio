import { useNavigate } from 'react-router-dom'
import type { Project } from '../stores/appStore'

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '실행 기록 없음'
  const diff = +new Date() - +new Date(dateStr)
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}달 전`
  return `${Math.floor(days / 365)}년 전`
}

const statusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: '완료', className: 'bg-green-900/40 text-green-400 border border-green-800' },
  failed: { label: '실패', className: 'bg-red-900/40 text-red-400 border border-red-800' },
  running: { label: '실행 중', className: 'bg-blue-900/40 text-blue-400 border border-blue-800' },
  pending: { label: '대기 중', className: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800' },
  cancelled: { label: '취소됨', className: 'bg-gray-800 text-gray-400 border border-gray-700' },
  approval_pending: {
    label: '승인 대기',
    className: 'bg-orange-900/40 text-orange-400 border border-orange-800',
  },
}

interface Props {
  project: Project
}

export function ProjectRowSkeleton() {
  return (
    <div className="flex items-center px-4 py-3.5 border-b border-gray-800/50 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0 mr-3" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2 mb-2">
          <div className="h-3.5 bg-gray-800 rounded w-32" />
          <div className="h-3 bg-gray-800 rounded w-16" />
        </div>
        <div className="flex justify-between gap-2">
          <div className="h-3 bg-gray-800 rounded w-48" />
          <div className="h-3 bg-gray-800 rounded w-10" />
        </div>
      </div>
    </div>
  )
}

export default function ProjectRow({ project }: Props) {
  const navigate = useNavigate()
  const badge = project.last_status ? statusConfig[project.last_status] : null

  return (
    <button
      onClick={() => navigate(`/projects/${project.id}/chat`)}
      className="group w-full flex items-center px-4 py-3.5 hover:bg-gray-800/40
                 border-b border-gray-800/50 text-left transition-colors relative
                 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5
                 before:bg-indigo-500 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
    >
      <div
        className="w-9 h-9 rounded-full bg-indigo-900/50 border border-indigo-800/50
                      flex items-center justify-center flex-shrink-0 mr-3"
      >
        <span className="text-indigo-300 text-sm font-semibold">
          {project.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-white text-sm truncate">{project.name}</span>
          <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums">
            {formatRelativeTime(project.last_run_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="font-mono text-xs text-gray-500 truncate">{project.path}</span>
          {badge ? (
            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${badge.className}`}>
              {badge.label}
            </span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-600 border border-gray-700 flex-shrink-0">
              없음
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
