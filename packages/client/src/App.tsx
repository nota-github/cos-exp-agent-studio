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
    return <div className="h-screen bg-gray-950" />
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
