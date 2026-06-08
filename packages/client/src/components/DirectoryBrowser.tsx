import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listDirectory } from '../api/filesystem'

interface Props {
  onPathChange: (path: string) => void
  onClose: () => void
}

export default function DirectoryBrowser({ onPathChange, onClose }: Props) {
  const [pathStack, setPathStack] = useState<string[]>([])
  const currentPath = pathStack.length > 0 ? pathStack[pathStack.length - 1] : undefined

  const { data: entries, isLoading, isError } = useQuery({
    queryKey: ['filesystem', currentPath ?? '__home__'],
    queryFn: () => listDirectory(currentPath),
    staleTime: 10_000,
  })

  const handleNavigate = (path: string) => {
    setPathStack(prev => [...prev, path])
    onPathChange(path)
  }

  const handleUp = () => {
    const newStack = pathStack.slice(0, -1)
    setPathStack(newStack)
    if (newStack.length > 0) {
      onPathChange(newStack[newStack.length - 1])
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-800/50">
        <button
          type="button"
          onClick={handleUp}
          disabled={pathStack.length === 0}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          위로 가기
        </button>
        <span className="text-xs text-gray-500 font-mono truncate flex-1">
          {currentPath ?? '~'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
          aria-label="브라우저 닫기"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-44 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-12 text-xs text-gray-500">
            불러오는 중...
          </div>
        )}
        {isError && (
          <div className="flex items-center justify-center h-12 text-xs text-red-400">
            디렉토리를 불러올 수 없습니다
          </div>
        )}
        {!isLoading && !isError && entries !== undefined && entries.length === 0 && (
          <div className="flex items-center justify-center h-12 text-xs text-gray-500">
            하위 디렉토리가 없습니다
          </div>
        )}
        {!isLoading && !isError && entries?.map((entry) => (
          <button
            key={entry.path}
            type="button"
            onClick={() => handleNavigate(entry.path)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/50
                       text-left transition-colors border-b border-gray-800/50 last:border-b-0 group"
          >
            <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-sm text-gray-300 group-hover:text-white truncate flex-1">{entry.name}</span>
            <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700 bg-gray-800/30">
        <span className="text-xs text-gray-500 truncate min-w-0">
          {currentPath ? '이 폴더를 선택하려면 선택 완료 클릭' : '폴더를 클릭해 탐색하세요'}
        </span>
        {currentPath && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1
                       rounded transition-colors font-medium flex-shrink-0 ml-2"
          >
            선택 완료
          </button>
        )}
      </div>
    </div>
  )
}
