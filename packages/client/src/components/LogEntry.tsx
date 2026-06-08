import { useState } from 'react'
import type { LogEntry as LogEntryType } from '../stores/logStore'

const CATEGORY_BADGE: Record<LogEntryType['category'], string> = {
  file_change: 'bg-purple-700 text-purple-100',
  command: 'bg-blue-700 text-blue-100',
  stdout: 'bg-gray-700 text-gray-300',
  stderr: 'bg-red-800 text-red-100',
}

const CATEGORY_LABEL: Record<LogEntryType['category'], string> = {
  file_change: '파일',
  command: '명령',
  stdout: '로그',
  stderr: '오류',
}

const CONTENT_LIMIT = 200

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toTimeString().slice(0, 8)
  } catch {
    return iso.slice(0, 8)
  }
}

interface Props {
  entry: LogEntryType
}

export default function LogEntry({ entry }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isError = entry.level === 'error'
  const isLong = entry.content.length > CONTENT_LIMIT
  const displayContent =
    isLong && !expanded ? entry.content.slice(0, CONTENT_LIMIT) + '…' : entry.content

  return (
    <div
      className={`px-3 py-2 text-xs font-mono border-l-2 ${
        isError
          ? 'border-red-500 bg-red-950/30 text-red-300'
          : 'border-transparent text-gray-300'
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-gray-500 shrink-0 tabular-nums">{formatTime(entry.timestamp)}</span>
        <span
          className={`px-1.5 rounded text-[10px] font-semibold shrink-0 ${CATEGORY_BADGE[entry.category] ?? CATEGORY_BADGE.stdout}`}
        >
          {CATEGORY_LABEL[entry.category] ?? entry.category}
        </span>
        {isError && <span className="text-red-400 shrink-0 text-[11px]">⚠</span>}
      </div>
      <pre className="whitespace-pre-wrap break-all leading-relaxed">{displayContent}</pre>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-blue-400 hover:text-blue-300 text-[11px] transition-colors"
        >
          {expanded ? '접기' : '펼치기'}
        </button>
      )}
    </div>
  )
}
