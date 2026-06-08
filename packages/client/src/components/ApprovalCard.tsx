import { useApproval, useRespondToApproval } from '../api/approvals'

interface Props {
  approvalId: string
  action_type?: string
  target?: string
  risk_level?: 'low' | 'medium' | 'high'
  description: string
}

const ACTION_LABELS: Record<string, string> = {
  file_modify: '파일 수정',
  file_create: '파일 생성',
  file_delete: '파일 삭제',
  package_install: '패키지 설치',
  command_exec: '명령 실행',
}

const RISK_BADGE_CLASS: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-blue-900/40 text-blue-300 border border-blue-800/40',
  medium: 'bg-amber-900/40 text-amber-300 border border-amber-800/40',
  high: 'bg-red-900/40 text-red-300 border border-red-800/40',
}

const RISK_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
}

export default function ApprovalCard({ approvalId, action_type, target, risk_level, description }: Props) {
  const { data: approval } = useApproval(approvalId)
  const { mutate: respond, isPending: responding } = useRespondToApproval(approvalId)

  // Prefer live query data; fall back to props from message metadata
  const displayActionType = approval?.action_type ?? action_type
  const displayTarget = approval?.target ?? target
  const displayRisk = (approval?.risk_level ?? risk_level ?? 'medium') as 'low' | 'medium' | 'high'
  const decidedStatus = approval && approval.status !== 'pending' ? approval.status : null
  const isDecided = decidedStatus !== null
  const isHighRisk = displayRisk === 'high'

  return (
    <div className="flex justify-center px-4 py-2">
      <div
        className={`w-full max-w-md rounded-xl border p-4 ${
          isHighRisk
            ? 'border-red-700/60 bg-red-950/20'
            : 'border-gray-700 bg-gray-900/60'
        }`}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base leading-none">{isHighRisk ? '⚠️' : 'ℹ️'}</span>
          <span className="text-sm font-semibold text-gray-200">승인 필요</span>
          <span
            className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-md ${RISK_BADGE_CLASS[displayRisk]}`}
          >
            위험도: {RISK_LABEL[displayRisk]}
          </span>
        </div>

        {/* Action type */}
        {displayActionType && (
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0">작업 유형</span>
            <span className="text-sm text-gray-300 font-medium">
              {ACTION_LABELS[displayActionType] ?? displayActionType}
            </span>
          </div>
        )}

        {/* Target */}
        {displayTarget && (
          <div className="flex items-start gap-3 mb-2">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0 mt-1">대상</span>
            <code className="flex-1 text-xs text-gray-300 font-mono bg-gray-800/60 rounded px-2 py-1 break-all">
              {displayTarget}
            </code>
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xs text-gray-500 w-14 flex-shrink-0 mt-0.5">설명</span>
            <span className="flex-1 text-xs text-gray-400 leading-relaxed">{description}</span>
          </div>
        )}

        {/* Decision outcome or action buttons */}
        {isDecided ? (
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
              decidedStatus === 'approved'
                ? 'bg-green-900/30 text-green-400 border-green-800/40'
                : 'bg-red-900/30 text-red-400 border-red-800/40'
            }`}
          >
            {decidedStatus === 'approved' ? '승인됨 ✓' : '거절됨 ✗'}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => respond('approved')}
              disabled={responding}
              className="flex-1 py-2 px-4 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              변경 승인
            </button>
            <button
              onClick={() => respond('rejected')}
              disabled={responding}
              className="flex-1 py-2 px-4 text-sm font-medium bg-transparent hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 border border-red-800/60 hover:border-red-700 rounded-lg transition-colors"
            >
              거절
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
