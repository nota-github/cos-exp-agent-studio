import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useExecution,
  useExecutionLogs,
  useExecutionMessages,
  createExecution,
} from '../api/executions'
import ExecutionStatusBadge from '../components/ExecutionStatusBadge'
import LogEntry from '../components/LogEntry'
import Sidebar from '../components/Sidebar'
import type { ExecutionStatus } from '../stores/appStore'
import type { LogEntry as LogEntryType } from '../stores/logStore'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`
  } catch {
    return iso.slice(0, 16)
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}m ${secs}s`
}

export default function ExecutionDetailView() {
  const { id: executionId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [logsExpanded, setLogsExpanded] = useState(false)
  const [rerunning, setRerunning] = useState(false)

  const { data: execution, isLoading: execLoading } = useExecution(executionId)
  const { data: logs } = useExecutionLogs(executionId)
  const { data: messages } = useExecutionMessages(executionId)

  const agentMessage = messages?.find((m) => m.type === 'agent')
  const fileChangeLogs = (logs ?? []).filter((l) => l.category === 'file_change')

  interface ApprovalHistoryEntry {
    approvalId: string
    action_type: string
    target: string
    risk_level: 'low' | 'medium' | 'high'
    decision: 'approved' | 'rejected' | null
  }

  const approvalHistory: ApprovalHistoryEntry[] = (() => {
    if (!messages) return []
    const requests = messages.filter((m) => m.type === 'approval_request')
    const results = messages.filter((m) => m.type === 'approval_result')
    return requests.map((req) => {
      let reqMeta: { approvalId?: string; action_type?: string; target?: string; risk_level?: string } = {}
      try { reqMeta = req.metadata ? (JSON.parse(req.metadata) as typeof reqMeta) : {} } catch {}
      const approvalId = reqMeta.approvalId ?? req.id
      const resultMsg = results.find((r) => {
        try {
          const m = r.metadata ? (JSON.parse(r.metadata) as { approvalId?: string }) : {}
          return m.approvalId === approvalId
        } catch { return false }
      })
      let decision: 'approved' | 'rejected' | null = null
      if (resultMsg) {
        try {
          const rm = resultMsg.metadata ? (JSON.parse(resultMsg.metadata) as { decision?: string }) : {}
          if (rm.decision === 'approved' || rm.decision === 'rejected') decision = rm.decision
          else decision = resultMsg.content.startsWith('approved') ? 'approved' : 'rejected'
        } catch {}
      }
      return {
        approvalId,
        action_type: reqMeta.action_type ?? 'command_exec',
        target: reqMeta.target ?? req.content.slice(0, 100),
        risk_level: (reqMeta.risk_level as 'low' | 'medium' | 'high') ?? 'medium',
        decision,
      }
    })
  })()

  const handleRerun = useCallback(async () => {
    if (!execution || rerunning) return
    setRerunning(true)
    try {
      const result = await createExecution(execution.project_id, execution.request_text)
      if (result.ok) {
        navigate(`/projects/${execution.project_id}/chat`)
      }
    } catch {
      // navigation only on success; silent fail otherwise
    } finally {
      setRerunning(false)
    }
  }, [execution, navigate, rerunning])

  if (execLoading) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <p className="text-gray-600 text-sm">불러오는 중...</p>
      </div>
    )
  }

  if (!execution) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <p className="text-gray-600 text-sm">실행 기록을 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar activeProjectId={execution.project_id} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => navigate(`/projects/${execution.project_id}/history`)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="실행 기록으로 돌아가기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-100 flex-1">실행 상세</h1>
          <ExecutionStatusBadge status={execution.status as ExecutionStatus} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

            {/* Request */}
            <section>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">요청</div>
              <div className="bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
                {execution.request_text}
              </div>
            </section>

            {/* Metadata */}
            <section className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
              <div>
                <span className="text-gray-600">시작</span>{' '}
                {formatDate(execution.started_at)}
              </div>
              {execution.completed_at && (
                <div>
                  <span className="text-gray-600">완료</span>{' '}
                  {formatDate(execution.completed_at)}
                </div>
              )}
              {execution.duration_ms !== null && (
                <div>
                  <span className="text-gray-600">소요</span>{' '}
                  {formatDuration(execution.duration_ms)}
                </div>
              )}
            </section>

            {/* Agent response */}
            {agentMessage && (
              <section>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">응답</div>
                <div className="bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {agentMessage.content}
                </div>
              </section>
            )}

            {/* Error message */}
            {execution.status === 'failed' && execution.error_message && (
              <section>
                <div className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">오류</div>
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-300 whitespace-pre-wrap leading-relaxed">
                  {execution.error_message}
                </div>
              </section>
            )}

            {/* File changes */}
            {fileChangeLogs.length > 0 && (
              <section>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  변경된 파일
                </div>
                <div className="space-y-1">
                  {fileChangeLogs.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/20 rounded-lg px-3 py-1.5"
                    >
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="truncate font-mono">{l.content}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Approval history */}
            {messages && (
              <section>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  승인 내역
                </div>
                {approvalHistory.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">이 실행에서 승인 요청이 없었습니다</p>
                ) : (
                  <div className="space-y-2">
                    {approvalHistory.map((entry) => {
                      const RISK_LABEL: Record<string, string> = { low: '낮음', medium: '보통', high: '높음' }
                      const RISK_CLASS: Record<string, string> = {
                        low: 'bg-blue-900/30 text-blue-300 border-blue-800/40',
                        medium: 'bg-amber-900/30 text-amber-300 border-amber-800/40',
                        high: 'bg-red-900/30 text-red-300 border-red-800/40',
                      }
                      const ACTION_LABELS: Record<string, string> = {
                        file_modify: '파일 수정',
                        file_create: '파일 생성',
                        file_delete: '파일 삭제',
                        package_install: '패키지 설치',
                        command_exec: '명령 실행',
                      }
                      const riskClass = RISK_CLASS[entry.risk_level] ?? RISK_CLASS['medium']
                      return (
                        <div
                          key={entry.approvalId}
                          className="flex items-center gap-3 text-xs bg-gray-900 rounded-lg px-3 py-2"
                        >
                          <span className={`px-1.5 py-0.5 rounded text-xs border flex-shrink-0 ${riskClass}`}>
                            {RISK_LABEL[entry.risk_level] ?? entry.risk_level}
                          </span>
                          <span className="text-gray-400 flex-shrink-0">
                            {ACTION_LABELS[entry.action_type] ?? entry.action_type}
                          </span>
                          <code className="flex-1 font-mono text-gray-300 truncate">
                            {entry.target}
                          </code>
                          {entry.decision === null ? (
                            <span className="text-gray-500 flex-shrink-0">대기 중</span>
                          ) : entry.decision === 'approved' ? (
                            <span className="text-green-400 flex-shrink-0 font-medium">승인됨 ✓</span>
                          ) : (
                            <span className="text-red-400 flex-shrink-0 font-medium">거절됨 ✗</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Logs accordion — collapsed by default */}
            {logs && logs.length > 0 && (
              <section>
                <button
                  onClick={() => setLogsExpanded((v) => !v)}
                  className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors w-full text-left mb-2"
                >
                  <svg
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${
                      logsExpanded ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  실행 로그 ({logs.length}줄)
                </button>
                {logsExpanded && (
                  <div className="bg-gray-900 rounded-xl overflow-hidden divide-y divide-gray-800/50">
                    {logs.map((entry) => (
                      <LogEntry key={entry.id} entry={entry as LogEntryType} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Footer: 다시 실행 */}
        <div className="flex-shrink-0 border-t border-gray-800 px-6 py-4">
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {rerunning ? '실행 시작 중...' : '다시 실행'}
          </button>
        </div>
      </div>
    </div>
  )
}
