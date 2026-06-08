import { create } from 'zustand'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error'
  category: 'stdout' | 'stderr' | 'file_change' | 'command'
  content: string
}

interface LogState {
  logs: Record<string, LogEntry[]>
  appendLogs: (executionId: string, entries: LogEntry[]) => void
  clearLogs: (executionId: string) => void
}

export const useLogStore = create<LogState>((set) => ({
  logs: {},
  appendLogs: (executionId, entries) =>
    set((state) => ({
      logs: {
        ...state.logs,
        [executionId]: [...(state.logs[executionId] ?? []), ...entries],
      },
    })),
  clearLogs: (executionId) =>
    set((state) => {
      const { [executionId]: _removed, ...rest } = state.logs
      return { logs: rest }
    }),
}))
