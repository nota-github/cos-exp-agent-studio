import { create } from 'zustand'

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'approval_pending'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface Project {
  id: string
  name: string
  path: string
  created_at: string
  last_run_at: string | null
  last_status: string | null
}

export interface AppSettings {
  cliPath: string
  defaultModel: string
  defaultProjectFolder: string
  runOptions: string
  historyRetentionCount: number
}

interface AppState {
  projects: Project[]
  selectedProjectId: string | null
  activeExecutions: Record<string, ExecutionStatus>
  currentExecutionId: string | null
  wsConnected: boolean
  reconnectAttempts: number
  isOnboarded: boolean
  settings: AppSettings
  logPanelOpen: boolean

  setProjects: (projects: Project[]) => void
  setSelectedProjectId: (id: string | null) => void
  setExecutionStatus: (executionId: string, status: ExecutionStatus) => void
  setCurrentExecutionId: (id: string | null) => void
  setWsConnected: (connected: boolean) => void
  setReconnectAttempts: (attempts: number) => void
  setIsOnboarded: (onboarded: boolean) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  setLogPanelOpen: (open: boolean) => void
}

const defaultSettings: AppSettings = {
  cliPath: '',
  defaultModel: '',
  defaultProjectFolder: '',
  runOptions: '',
  historyRetentionCount: 100,
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  selectedProjectId: null,
  activeExecutions: {},
  currentExecutionId: null,
  wsConnected: false,
  reconnectAttempts: 0,
  isOnboarded: false,
  settings: defaultSettings,
  logPanelOpen: false,

  setProjects: (projects) => set({ projects }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setExecutionStatus: (executionId, status) =>
    set((state) => ({
      activeExecutions: { ...state.activeExecutions, [executionId]: status },
    })),
  setCurrentExecutionId: (id) => set({ currentExecutionId: id }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
  setIsOnboarded: (onboarded) => set({ isOnboarded: onboarded }),
  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
  setLogPanelOpen: (open) => set({ logPanelOpen: open }),
}))
