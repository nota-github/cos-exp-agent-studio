import { useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLogStore } from '../stores/logStore'
import type { LogEntry as LogEntryType } from '../stores/logStore'
import LogEntry from './LogEntry'

const VIRTUAL_THRESHOLD = 200
const EMPTY_LOGS: LogEntryType[] = []

interface Props {
  executionId: string | null
  open: boolean
}

interface VirtualSectionProps {
  entries: LogEntryType[]
}

function VirtualSection({ entries }: VirtualSectionProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  })

  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }, [])

  useEffect(() => {
    if (atBottomRef.current && entries.length > 0) {
      virtualizer.scrollToIndex(entries.length - 1, { align: 'end' })
    }
    // virtualizer instance is stable — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length])

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto min-h-0"
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            data-index={vItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vItem.start}px)`,
            }}
          >
            <LogEntry entry={entries[vItem.index]!} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LogPanel({ executionId, open }: Props) {
  const logs = useLogStore((s) => (executionId ? (s.logs[executionId] ?? EMPTY_LOGS) : EMPTY_LOGS))
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  const generalLogs = logs.filter((e) => e.category !== 'file_change' && e.category !== 'command')
  const fileLogs = logs.filter((e) => e.category === 'file_change')
  const commandLogs = logs.filter((e) => e.category === 'command')

  const useVirtual = generalLogs.length > VIRTUAL_THRESHOLD

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }, [])

  useEffect(() => {
    if (!useVirtual && atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, useVirtual])

  return (
    <div
      className={`absolute right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-20 transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-300">실행 로그</span>
        {executionId ? (
          <span className="text-[10px] text-gray-600 font-mono">#{executionId.slice(0, 8)}</span>
        ) : (
          <span className="text-[10px] text-gray-600">실행 없음</span>
        )}
      </div>

      {useVirtual ? (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-h-0 border-b border-gray-800">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60 flex-shrink-0">
              일반 로그
            </div>
            <VirtualSection entries={generalLogs} />
          </div>

          <div className="border-b border-gray-800 flex-shrink-0">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60">
              파일 변경
            </div>
            {fileLogs.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-gray-600">변경 없음</p>
            ) : (
              <div className="divide-y divide-gray-800/40 max-h-32 overflow-y-auto">
                {fileLogs.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60">
              실행된 명령어
            </div>
            {commandLogs.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-gray-600">명령 없음</p>
            ) : (
              <div className="divide-y divide-gray-800/40 max-h-32 overflow-y-auto">
                {commandLogs.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-800">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60 sticky top-0">
              일반 로그
            </div>
            {generalLogs.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-gray-600">로그 없음</p>
            ) : (
              <div className="divide-y divide-gray-800/40">
                {generalLogs.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>

          <div className="border-b border-gray-800">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60 sticky top-0">
              파일 변경
            </div>
            {fileLogs.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-gray-600">변경 없음</p>
            ) : (
              <div className="divide-y divide-gray-800/40">
                {fileLogs.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60 sticky top-0">
              실행된 명령어
            </div>
            {commandLogs.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-gray-600">명령 없음</p>
            ) : (
              <div className="divide-y divide-gray-800/40">
                {commandLogs.map((entry) => (
                  <LogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
