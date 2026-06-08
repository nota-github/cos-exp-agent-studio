import { useState, useEffect, useRef } from 'react'
import { useCreateProject } from '../api/projects'
import DirectoryBrowser from './DirectoryBrowser'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function AddProjectModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [nameError, setNameError] = useState('')
  const [pathError, setPathError] = useState('')
  const [apiError, setApiError] = useState('')
  const [showBrowser, setShowBrowser] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const createProject = useCreateProject()

  useEffect(() => {
    if (isOpen) {
      setName('')
      setPath('')
      setNameError('')
      setPathError('')
      setApiError('')
      setShowBrowser(false)
      createProject.reset()
      const timer = setTimeout(() => nameRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const validate = (): boolean => {
    let valid = true
    if (!name.trim()) {
      setNameError('프로젝트 이름을 입력해 주세요')
      valid = false
    } else {
      setNameError('')
    }
    if (!path.trim()) {
      setPathError('폴더 경로를 입력해 주세요')
      valid = false
    } else {
      setPathError('')
    }
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setApiError('')
    try {
      await createProject.mutateAsync({ name: name.trim(), path: path.trim() })
      onClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '프로젝트 등록에 실패했습니다')
    }
  }

  const handlePathChange = (selectedPath: string) => {
    setPath(selectedPath)
    setPathError('')
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">새 프로젝트 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {apiError && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-lg px-4 py-3">
              <p className="text-sm text-red-400">{apiError}</p>
            </div>
          )}

          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-gray-300 mb-1.5">
              프로젝트 이름 <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              placeholder="예: My Project"
              className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white
                         placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                         ${nameError ? 'border-red-600' : 'border-gray-700 focus:border-indigo-600'}`}
            />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>

          <div>
            <label htmlFor="project-path" className="block text-sm font-medium text-gray-300 mb-1.5">
              프로젝트 폴더 <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="project-path"
                type="text"
                value={path}
                onChange={(e) => { setPath(e.target.value); setPathError('') }}
                placeholder="/Users/me/projects/my-project"
                className={`flex-1 bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white
                           font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                           ${pathError ? 'border-red-600' : 'border-gray-700 focus:border-indigo-600'}`}
              />
              <button
                type="button"
                onClick={() => setShowBrowser(v => !v)}
                className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors flex-shrink-0
                           ${showBrowser
                             ? 'bg-indigo-600 border-indigo-600 text-white'
                             : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                폴더 탐색
              </button>
            </div>
            {pathError && <p className="mt-1 text-xs text-red-400">{pathError}</p>}
            {showBrowser && (
              <div className="mt-2">
                <DirectoryBrowser
                  onPathChange={handlePathChange}
                  onClose={() => setShowBrowser(false)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white px-4 py-2 rounded-lg
                         hover:bg-gray-800 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createProject.isPending}
              className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500
                         disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2
                         rounded-lg transition-colors font-medium"
            >
              {createProject.isPending ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  추가 중...
                </>
              ) : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
