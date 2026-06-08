import { Link, useNavigate } from 'react-router-dom'
import { useProjects } from '../api/projects'

interface Props {
  activeProjectId: string | undefined
}

export default function Sidebar({ activeProjectId }: Props) {
  const { data: projects } = useProjects()
  const navigate = useNavigate()

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex-shrink-0 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">AS</span>
        </div>
        <span className="text-sm font-semibold text-gray-200 truncate">Agent Studio</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-1 mb-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            프로젝트
          </span>
        </div>
        {projects && projects.length > 0 ? (
          projects.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}/chat`)}
              className={`w-full text-left px-3 py-2 mx-1 rounded-lg text-sm transition-colors ${
                p.id === activeProjectId
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-700/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
              }`}
              style={{ width: 'calc(100% - 0.5rem)' }}
            >
              <div className="truncate font-medium">{p.name}</div>
              <div className="truncate text-xs text-gray-600 mt-0.5">{p.path}</div>
            </button>
          ))
        ) : (
          <Link
            to="/projects"
            className="block px-3 py-2 text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            프로젝트를 추가하세요
          </Link>
        )}
      </div>

      <div className="border-t border-gray-800 px-3 py-2 space-y-0.5 flex-shrink-0">
        {activeProjectId && (
          <Link
            to={`/projects/${activeProjectId}/history`}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            실행 기록
          </Link>
        )}
        <Link
          to="/settings"
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          설정
        </Link>
      </div>
    </aside>
  )
}
