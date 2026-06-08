import type { ChatMessage } from '../api/messages'

interface FileChangeMeta {
  fileChanges?: string[]
  commandsRun?: string[]
}

interface Props {
  message: ChatMessage
  onRerun?: () => void
  onEditRerun?: (text: string) => void
  canRerun?: boolean
}

export default function MessageBubble({ message, onRerun, onEditRerun, canRerun = true }: Props) {
  const { type, content, metadata } = message

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
