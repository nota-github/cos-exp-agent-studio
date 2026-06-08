import { Routes, Route, Navigate } from 'react-router-dom'
import OnboardingWizard from './views/OnboardingWizard'
import ProjectInboxView from './views/ProjectInboxView'
import ChatView from './views/ChatView'
import ExecutionHistoryView from './views/ExecutionHistoryView'
import ExecutionDetailView from './views/ExecutionDetailView'
import SettingsView from './views/SettingsView'
import NotFoundView from './views/NotFoundView'

export default function App() {
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
