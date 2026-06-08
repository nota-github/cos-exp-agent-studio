import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSettings, testCli } from '../api/settings'
import type { TestResult } from '../api/settings'
import DirectoryBrowser from '../components/DirectoryBrowser'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['CLI 경로', 'API 키', '프로젝트 폴더', '설정 테스트']

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)

  const [cliPath, setCliPath] = useState('')
  const [cliPathError, setCliPathError] = useState<string | null>(null)
  const [showCliPicker, setShowCliPicker] = useState(false)

  const [apiKey, setApiKey] = useState('')

  const [defaultProjectFolder, setDefaultProjectFolder] = useState('')
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saving, setSaving] = useState(false)

  const runTest = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (step === 4) {
      runTest()
    }
  }, [step, runTest])

  const handleStep1Next = async () => {
    if (!cliPath.trim()) {
      setCliPathError('CLI 도구 경로를 입력해주세요. 예: /usr/local/bin/claude')
      return
    }
    setCliPathError(null)
    setSaving(true)
    try {
      await saveSettings({ cliPath: cliPath.trim() })
    } catch {
      /* proceed even if save fails */
    } finally {
      setSaving(false)
    }
    setStep(2)
  }

  const handleStep2Next = async () => {
    setSaving(true)
    try {
      if (apiKey.trim()) {
        await saveSettings({ apiKey: apiKey.trim() })
      }
    } catch {
      /* proceed even if save fails */
    } finally {
      setSaving(false)
    }
    setStep(3)
  }

  const handleStep3Next = async () => {
    setSaving(true)
    try {
      if (defaultProjectFolder.trim()) {
        await saveSettings({ defaultProjectFolder: defaultProjectFolder.trim() })
      }
    } catch {
      /* proceed even if save fails */
    } finally {
      setSaving(false)
    }
    setStep(4)
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
      <div className="w-full max-w-lg px-8">

        {/* Stepper */}
        <div className="flex items-center mb-2">
          {([1, 2, 3, 4] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ' +
                  (s === step
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
                    : s < step
                    ? 'bg-indigo-900 text-indigo-300'
                    : 'bg-gray-800 text-gray-500')
                }
              >
                {s < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              {i < 3 && (
                <div className={'flex-1 h-px mx-1 ' + (s < step ? 'bg-indigo-800' : 'bg-gray-800')} />
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="flex items-start mb-1">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={
                'flex-1 last:flex-none text-center text-xs ' +
                (i + 1 === step ? 'text-indigo-400 font-medium' : 'text-gray-600')
              }
              style={{ maxWidth: i < 3 ? undefined : 'fit-content' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Step counter */}
        <p className="text-xs text-gray-600 mb-6 text-right">{step} / 4</p>

        {/* ── Step 1: CLI 도구 경로 ── */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-white mb-1">CLI 도구 경로 설정</h1>
            <p className="text-sm text-gray-400 mb-6">
              OpenClaw 실행 파일의 경로를 입력하세요
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={cliPath}
                onChange={e => { setCliPath(e.target.value); setCliPathError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleStep1Next()}
                placeholder="/usr/local/bin/claude"
                autoFocus
                className={
                  'flex-1 bg-gray-900 border rounded-lg px-3 py-2 text-sm text-gray-100 ' +
                  'placeholder-gray-600 focus:outline-none transition-colors font-mono ' +
                  (cliPathError
                    ? 'border-red-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
                    : 'border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30')
                }
              />
              <button
                type="button"
                onClick={() => setShowCliPicker(v => !v)}
                className="flex-shrink-0 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700
                           border border-gray-700 rounded-lg text-gray-300 transition-colors"
              >
                찾아보기
              </button>
            </div>

            {cliPathError && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                {cliPathError}
              </div>
            )}

            {showCliPicker && (
              <div className="mt-2">
                <DirectoryBrowser
                  onPathChange={path => { setCliPath(path); setCliPathError(null) }}
                  onClose={() => setShowCliPicker(false)}
                />
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleStep1Next}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500
                           rounded-lg text-white transition-colors disabled:opacity-50 font-medium"
              >
                {saving ? <><Spinner />저장 중...</> : '다음'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: API 키 ── */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-white mb-1">API 키 입력</h1>
            <p className="text-sm text-gray-400 mb-1">
              Anthropic API 키를 입력하세요
            </p>
            <p className="text-xs text-gray-500 mb-6">
              CLI 도구가 Claude API를 호출하는 데 사용됩니다.{' '}
              <code className="text-indigo-300 bg-gray-800 px-1 rounded text-xs">ANTHROPIC_API_KEY</code>{' '}
              환경 변수로 이미 설정된 경우 "나중에 설정"을 누르세요.
            </p>

            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStep2Next()}
              placeholder="sk-ant-..."
              autoFocus
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                         text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500
                         focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                이전
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 border border-gray-700
                             rounded-lg transition-colors"
                >
                  나중에 설정
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500
                             rounded-lg text-white transition-colors disabled:opacity-50 font-medium"
                >
                  {saving ? <><Spinner />저장 중...</> : '다음'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: 기본 프로젝트 폴더 (선택) ── */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              기본 프로젝트 폴더{' '}
              <span className="text-sm font-normal text-gray-500">(선택)</span>
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              새 프로젝트 추가 시 기본으로 열릴 폴더입니다. 지금 건너뛰어도 나중에 설정할 수 있습니다.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={defaultProjectFolder}
                onChange={e => setDefaultProjectFolder(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStep3Next()}
                placeholder="/Users/me/projects"
                autoFocus
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                           text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500
                           focus:ring-1 focus:ring-indigo-500/30 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowFolderPicker(v => !v)}
                className="flex-shrink-0 px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700
                           border border-gray-700 rounded-lg text-gray-300 transition-colors"
              >
                찾아보기
              </button>
            </div>

            {showFolderPicker && (
              <div className="mt-2">
                <DirectoryBrowser
                  onPathChange={path => setDefaultProjectFolder(path)}
                  onClose={() => setShowFolderPicker(false)}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                이전
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 border border-gray-700
                             rounded-lg transition-colors"
                >
                  건너뛰기
                </button>
                <button
                  type="button"
                  onClick={handleStep3Next}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500
                             rounded-lg text-white transition-colors disabled:opacity-50 font-medium"
                >
                  {saving ? <><Spinner />저장 중...</> : '다음'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: 설정 테스트 ── */}
        {step === 4 && (
          <div>
            <h1 className="text-xl font-bold text-white mb-1">설정 테스트</h1>
            <p className="text-sm text-gray-400 mb-6">
              CLI 도구가 올바르게 실행 가능한지 확인합니다
            </p>

            {testing && (
              <div className="flex items-center gap-3 py-8">
                <svg className="w-5 h-5 animate-spin text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-gray-400">CLI 도구를 테스트하고 있습니다...</span>
              </div>
            )}

            {!testing && testResult && (
              <div
                className={
                  'flex items-start gap-3 px-4 py-4 rounded-lg mb-2 ' +
                  (testResult.ok
                    ? 'bg-emerald-900/20 border border-emerald-800/40'
                    : 'bg-red-900/20 border border-red-800/40')
                }
              >
                {testResult.ok ? (
                  <>
                    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-sm text-emerald-300 font-medium">CLI 도구가 정상 작동합니다</p>
                      {testResult.output && (
                        <p className="text-xs text-emerald-500/70 font-mono mt-1 break-all">{testResult.output}</p>
                      )}
                      <p className="text-xs text-emerald-500/60 mt-1">이제 Agent Studio를 시작할 준비가 되었습니다.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-red-300 font-medium">CLI 도구를 실행할 수 없습니다</p>
                      <p className="text-xs text-red-400 mt-1">
                        {testResult.error ?? 'CLI 경로가 올바른지 확인하세요.'}
                      </p>
                      <p className="text-xs text-red-500/70 mt-2">
                        "이전" 버튼으로 이전 단계로 돌아가 설정을 수정할 수 있습니다.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                이전
              </button>
              <div className="flex items-center gap-2">
                {!testing && testResult && !testResult.ok && (
                  <button
                    type="button"
                    onClick={runTest}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700
                               border border-gray-700 rounded-lg text-gray-200 transition-colors"
                  >
                    다시 시도
                  </button>
                )}
                {!testing && testResult?.ok && (
                  <button
                    type="button"
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-500
                               rounded-lg text-white transition-colors font-medium"
                  >
                    시작하기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
