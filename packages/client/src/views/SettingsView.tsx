import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveSettings, testCli } from '../api/settings'
import type { SettingsConfig, TestResult } from '../api/settings'
import DirectoryBrowser from '../components/DirectoryBrowser'

const MODEL_OPTIONS = [
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { value: 'custom', label: '직접 입력' },
]

interface FormState {
  cliPath: string
  apiKey: string
  modelPreset: string
  customModel: string
  defaultProjectFolder: string
  runOptions: string
  historyRetentionCount: number
}

function resolveModelPreset(model: string): { preset: string; custom: string } {
  if (!model) return { preset: '', custom: '' }
  const known = MODEL_OPTIONS.find(o => o.value !== 'custom' && o.value === model)
  return known ? { preset: model, custom: '' } : { preset: 'custom', custom: model }
}

export default function SettingsView() {
  const [form, setForm] = useState<FormState>({
    cliPath: '',
    apiKey: '',
    modelPreset: '',
    customModel: '',
    defaultProjectFolder: '',
    runOptions: '',
    historyRetentionCount: 100,
  })
  const [apiKeySet, setApiKeySet] = useState(false)
  const [showCliPicker, setShowCliPicker] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [cliPickerPath, setCliPickerPath] = useState('')
  const [folderPickerPath, setFolderPickerPath] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getSettings()
      .then((cfg: SettingsConfig) => {
        const { preset, custom } = resolveModelPreset(cfg.defaultModel ?? '')
        setForm({
          cliPath: cfg.cliPath ?? '',
          apiKey: '',
          modelPreset: preset,
          customModel: custom,
          defaultProjectFolder: cfg.defaultProjectFolder ?? '',
          runOptions: cfg.runOptions ?? '',
          historyRetentionCount: cfg.historyRetentionCount ?? 100,
        })
        setApiKeySet(cfg.apiKeySet ?? false)
      })
      .catch(() => setLoadError('설정을 불러오는 중 오류가 발생했습니다'))
  }, [])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveMsg(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testCli()
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, output: '', error: 'CLI 테스트 요청 중 오류가 발생했습니다' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current)
    try {
      const resolvedModel =
        form.modelPreset === 'custom' ? form.customModel : form.modelPreset
      const payload: Partial<SettingsConfig> = {
        cliPath: form.cliPath,
        defaultModel: resolvedModel,
        defaultProjectFolder: form.defaultProjectFolder,
        runOptions: form.runOptions,
        historyRetentionCount: Number(form.historyRetentionCount),
      }
      if (form.apiKey) {
        payload.apiKey = form.apiKey
      }
      const updated = await saveSettings(payload)
      setApiKeySet(updated.apiKeySet)
      setField('apiKey', '')
      setSaveMsg({ ok: true, text: '설정이 저장되었습니다' })
      saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '설정 저장 중 오류가 발생했습니다'
      setSaveMsg({ ok: false, text: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Narrow left icon rail */}
      <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center pt-4 pb-4 flex-shrink-0">
        <Link
          to="/projects"
          className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center mb-6"
        >
          <span className="text-white text-xs font-bold tracking-tight">AS</span>
        </Link>
        <div className="flex-1 flex flex-col items-center gap-1">
          <Link
            to="/projects"
            title="프로젝트"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500
                       hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </Link>
        </div>
        <Link
          to="/settings"
          title="설정"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-700/60
                     text-indigo-400 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94
                 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724
                 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572
                 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31
                 -.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724
                 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
      </div>

      {/* Main settings pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center px-5 py-4 border-b border-gray-800 bg-gray-950 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">설정</h1>
            <p className="text-xs text-gray-500 mt-0.5">CLI 도구 및 API 설정을 관리합니다</p>
          </div>
        </div>

        {/* Settings form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 py-6 space-y-8">

            {loadError && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-900/20 border border-red-800/40
                              rounded-lg text-sm text-red-300">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71
                       3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                {loadError}
              </div>
            )}

            {/* Section 1: CLI 도구 실행 경로 */}
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">CLI 도구 실행 경로</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  OpenClaw 등 CLI 에이전트 실행 파일의 경로를 입력하세요
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.cliPath}
                  onChange={e => setField('cliPath', e.target.value)}
                  placeholder="/usr/local/bin/claude"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                             text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500
                             focus:ring-1 focus:ring-indigo-500/30 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCliPicker(v => !v)
                    setShowFolderPicker(false)
                  }}
                  className="flex-shrink-0 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700
                             border border-gray-700 rounded-lg text-gray-300 transition-colors"
                >
                  찾아보기
                </button>
              </div>
              {showCliPicker && (
                <div className="mt-2">
                  <DirectoryBrowser
                    onPathChange={path => {
                      setCliPickerPath(path)
                      setField('cliPath', path)
                    }}
                    onClose={() => {
                      if (cliPickerPath) setField('cliPath', cliPickerPath)
                      setShowCliPicker(false)
                    }}
                  />
                </div>
              )}
            </section>

            {/* Section 2: API 키 */}
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">API 키</h3>
                <p className="text-xs text-gray-500 mt-0.5">CLI 도구에서 사용할 Anthropic API 키를 입력하세요</p>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={e => setField('apiKey', e.target.value)}
                  placeholder={
                    apiKeySet && !form.apiKey
                      ? '현재 저장된 키 유지 (변경하려면 새 키 입력)'
                      : 'sk-ant-...'
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                             text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500
                             focus:ring-1 focus:ring-indigo-500/30 transition-colors pr-24"
                />
                {apiKeySet && !form.apiKey && (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1
                               text-xs text-emerald-400 font-medium pointer-events-none select-none"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    저장됨 ✓
                  </span>
                )}
              </div>
            </section>

            {/* Section 3: 기본 모델 */}
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">기본 모델</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  CLI 실행 시 기본으로 사용할 Claude 모델을 선택하세요
                </p>
              </div>
              <select
                value={form.modelPreset}
                onChange={e => setField('modelPreset', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                           text-gray-100 focus:outline-none focus:border-indigo-500
                           focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              >
                <option value="">선택하지 않음</option>
                {MODEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {form.modelPreset === 'custom' && (
                <input
                  type="text"
                  value={form.customModel}
                  onChange={e => setField('customModel', e.target.value)}
                  placeholder="모델 ID를 직접 입력하세요"
                  className="mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2
                             text-sm text-gray-100 placeholder-gray-600 focus:outline-none
                             focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors
                             font-mono"
                />
              )}
            </section>

            {/* Section 4: 기본 프로젝트 폴더 */}
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">기본 프로젝트 폴더</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  새 프로젝트 추가 시 기본으로 열릴 폴더를 설정하세요
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.defaultProjectFolder}
                  onChange={e => setField('defaultProjectFolder', e.target.value)}
                  placeholder="/Users/me/projects"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                             text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500
                             focus:ring-1 focus:ring-indigo-500/30 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowFolderPicker(v => !v)
                    setShowCliPicker(false)
                  }}
                  className="flex-shrink-0 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700
                             border border-gray-700 rounded-lg text-gray-300 transition-colors"
                >
                  찾아보기
                </button>
              </div>
              {showFolderPicker && (
                <div className="mt-2">
                  <DirectoryBrowser
                    onPathChange={path => {
                      setFolderPickerPath(path)
                      setField('defaultProjectFolder', path)
                    }}
                    onClose={() => {
                      if (folderPickerPath) setField('defaultProjectFolder', folderPickerPath)
                      setShowFolderPicker(false)
                    }}
                  />
                </div>
              )}
            </section>

            {/* Section 5: 기본 실행 옵션 */}
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">기본 실행 옵션</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  CLI 실행 시 추가로 전달할 플래그나 옵션을 입력하세요
                </p>
              </div>
              <input
                type="text"
                value={form.runOptions}
                onChange={e => setField('runOptions', e.target.value)}
                placeholder="예: --max-turns 10 --verbose"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                           text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500
                           focus:ring-1 focus:ring-indigo-500/30 transition-colors font-mono"
              />
            </section>

            {/* Section 6: 실행 기록 보존 */}
            <section>
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">실행 기록 보존</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  프로젝트당 저장할 최대 실행 기록 수 (1–500)
                </p>
              </div>
              <input
                type="number"
                min={1}
                max={500}
                value={form.historyRetentionCount}
                onChange={e => setField('historyRetentionCount', Number(e.target.value))}
                className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                           text-gray-100 focus:outline-none focus:border-indigo-500
                           focus:ring-1 focus:ring-indigo-500/30 transition-colors"
              />
            </section>

            {/* Action bar */}
            <div className="pt-2 pb-8 border-t border-gray-800">
              <div className="flex flex-wrap items-start gap-3 pt-5">

                {/* Test button + inline result */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700
                               border border-gray-700 rounded-lg text-gray-200 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {testing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        테스트 중...
                      </>
                    ) : '설정 테스트'}
                  </button>
                  {testResult && (
                    <div
                      className={
                        'flex items-start gap-2 px-3 py-2 rounded-lg text-xs max-w-xs ' +
                        (testResult.ok
                          ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-300'
                          : 'bg-red-900/20 border border-red-800/40 text-red-300')
                      }
                    >
                      {testResult.ok ? (
                        <>
                          <svg
                            className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>
                            CLI 도구가 정상 작동합니다
                            {testResult.output && (
                              <span className="block text-emerald-500 font-mono mt-0.5 text-xs">
                                {testResult.output}
                              </span>
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0
                                 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                            />
                          </svg>
                          <span>{testResult.error ?? 'CLI 도구를 실행할 수 없습니다'}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Save button + save message */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500
                               rounded-lg text-white transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {saving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        저장 중...
                      </>
                    ) : '저장'}
                  </button>
                  {saveMsg && (
                    <div
                      className={
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs ' +
                        (saveMsg.ok
                          ? 'bg-emerald-900/20 border border-emerald-800/40 text-emerald-300'
                          : 'bg-red-900/20 border border-red-800/40 text-red-300')
                      }
                    >
                      {saveMsg.ok ? (
                        <svg
                          className="w-3.5 h-3.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      {saveMsg.text}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
