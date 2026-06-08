import type { ChatMessage } from '../api/messages'
import ApprovalCard from './ApprovalCard'

interface FileChangeMeta {
  fileChanges?: string[]
  commandsRun?: string[]
}

interface ApprovalMeta {
  approvalId: string
  action_type?: string
  target?: string
  risk_level?: 'low' | 'medium' | 'high'
}

interface Props {
  message: ChatMessage
  onRerun?: () => void
  onEditRerun?: (text: string) => void
  canRerun?: boolean
}

export default function MessageBubble({ message, onRerun, onEditRerun, canRerun = true }: Props) {
  const { type, content, metadata } = message

  if (type === 'approval_request') {
    let approvalMeta: ApprovalMeta | null = null
    if (metadata) {
      try {
        approvalMeta = JSON.parse(metadata) as ApprovalMeta
      } catch {
        // ignore malformed metadata
      }
    }
    if (!approvalMeta?.approvalId) return null
    return (
      <ApprovalCard
        approvalId={approvalMeta.approvalId}
        action_type={approvalMeta.action_type}
        target={approvalMeta.target}
        risk_level={approvalMeta.risk_level}
        description={content}
      />
    )
  }

  if (type === 'approval_result') {
    let meta: { decision?: string; target?: string } | null = null
    if (metadata) {
      try {
        meta = JSON.parse(metadata) as { decision?: string; target?: string }
      } catch {
        // ignore malformed metadata
      }
    }
    const decision = meta?.decision ?? (content.startsWith('approved') ? 'approved' : 'rejected')
    const isApproved = decision === 'approved'
    const rawTarget = meta?.target ?? content.replace(/^(approved|rejected):\s*/, '')
    const truncatedTarget = rawTarget.length > 50 ? rawTarget.slice(0, 50) + '…' : rawTarget
    return (
      <div className="flex justify-center py-2 px-4">
        <span
          className={`px-3 py-1 text-xs rounded-full border ${
            isApproved
              ? 'text-green-400 bg-green-900/20 border-green-800/40'
              : 'text-red-400 bg-red-900/20 border-red-800/40'
          }`}
        >
          {isApproved ? '✓ 승인됨' : '✗ 거절됨'}
          {truncatedTarget ? `: ${truncatedTarget}` : ''}
        </span>
      </div>
    )
  }

  if (type === 'system') {
    return (
      <div className="flex justify-center py-2 px-4">
        <span className="px-3 py-1 text-xs text-gray-500 bg-gray-800/60 rounded-full">
          {content}
        </span>
      </div>
    )
  }

  if (type === 'user') {
    const hasActions = onRerun != null || onEditRerun != null
    return (
      <div className="relative flex justify-end px-4 py-1 group">
        {hasActions && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={() => onEditRerun?.(content)}
              disabled={!canRerun}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-800/60 transition-colors whitespace-nowrap"
            >
              수정 후 실행
            </button>
            <button
              onClick={() => onRerun?.()}
              disabled={!canRerun}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-gray-800/60 transition-colors whitespace-nowrap"
            >
              다시 실행
            </button>
          </div>
        )}
        <div className="max-w-[70%]">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
      </div>
    )
  }

  let fileMeta: FileChangeMeta | null = null
  if (metadata) {
    try {
      fileMeta = JSON.parse(metadata) as FileChangeMeta
    } catch {
      // ignore malformed metadata
    }
  }

  return (
    <div className="flex justify-start px-4 py-1">
      <div className="max-w-[70%]">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 bg-gray-700 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5">
            <svg
              className="w-4 h-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </div>
            {fileMeta?.fileChanges && fileMeta.fileChanges.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {fileMeta.fileChanges.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 rounded-md font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
