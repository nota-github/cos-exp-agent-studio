import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from './stores/appStore'
import { apiGet } from './api/client'
import OnboardingWizard from './views/OnboardingWizard'
import ProjectInboxView from './views/ProjectInboxView'
import ChatView from './views/ChatView'
import ExecutionHistoryView from './views/ExecutionHistoryView'
import ExecutionDetailView from './views/ExecutionDetailView'
import SettingsView from './views/SettingsView'
import NotFoundView from './views/NotFoundView'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const setIsOnboarded = useAppStore((s) => s.setIsOnboarded)
  const [checking, setChecking] = useState(true)
  const initialPath = useRef(location.pathname)

  useEffect(() => {
    let active = true
    apiGet<{ isConfigured: boolean; missing: string[] }>('/settings/status')
      .then(({ isConfigured }) => {
        if (!active) return
        setIsOnboarded(isConfigured)
        if (!isConfigured && initialPath.current !== '/onboarding') {
          navigate('/onboarding', { replace: true })
        } else if (isConfigured && initialPath.current === '/onboarding') {
          navigate('/projects', { replace: true })
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [navigate, setIsOnboarded])

  if (checking) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-sm font-bold tracking-tight">AS</span>
        </div>
        <svg className="w-5 h-5 animate-spin text-gray-700" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/projects" element={<ProjectInboxView />} />
      <Route path="/projects/:id/chat" element={<ChatView />} />
      <Route path="/projects/:id/history" element={<ExecutionHistoryView />} />
      <Route path="/executions/:id" element={<ExecutionDetailView />} />
      <Route path="/settings" element={<SettingsView />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  )
}
