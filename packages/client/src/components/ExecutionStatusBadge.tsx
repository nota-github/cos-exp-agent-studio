import type { ExecutionStatus } from '../stores/appStore'

interface Props {
  status: ExecutionStatus | null
}

interface StatusConfig {
  label: string
  className: string
  showSpinner?: boolean
}

const STATUS_CONFIG: Partial<Record<ExecutionStatus, StatusConfig>> = {
  pending: { label: '대기 중', className: 'bg-gray-700 text-gray-300' },
  running: { label: '실행 중', className: 'bg-blue-600 text-white', showSpinner: true },
  approval_pending: { label: '승인 필요', className: 'bg-yellow-500 text-white' },
  completed: { label: '완료', className: 'bg-green-600 text-white' },
  failed: { label: '실패', className: 'bg-red-600 text-white' },
  cancelled: { label: '취소됨', className: 'bg-gray-600 text-gray-200' },
}

export default function ExecutionStatusBadge({ status }: Props) {
  if (!status) return null

  const config = STATUS_CONFIG[status]
  if (!config) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.showSpinner && (
        <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
      )}
      {config.label}
    </span>
  )
}
