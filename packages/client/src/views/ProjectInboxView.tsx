import { useState } from 'react'
import { useProjects } from '../api/projects'
import ProjectRow, { ProjectRowSkeleton } from '../components/ProjectRow'
import AddProjectModal from '../components/AddProjectModal'

export default function ProjectInboxView() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: projects, isLoading, isError } = useProjects()

  const handleAddProject = () => setModalOpen(true)

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Narrow left icon rail */}
      <div className="w-14 bg-gray-900 border-r border-gray-800 flex flex-col items-center pt-4 pb-4 flex-shrink-0">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-xs font-bold tracking-tight">AS</span>
        </div>
      </div>

      {/* Main inbox pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Inbox header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-950 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">내 프로젝트</h1>
            <p className="text-xs text-gray-500 mt-0.5">Agent Studio</p>
          </div>
          <button
            onClick={handleAddProject}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500
                       text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 프로젝트 추가
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <>
              <ProjectRowSkeleton />
              <ProjectRowSkeleton />
              <ProjectRowSkeleton />
            </>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-12 h-12 bg-red-900/30 border border-red-800/50 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-300 font-medium text-sm mb-1">
                프로젝트 목록을 불러오지 못했습니다
              </p>
              <p className="text-gray-500 text-xs">서버 연결을 확인하고 새로고침해 주세요.</p>
            </div>
          )}

          {!isLoading && !isError && projects && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 bg-gray-800/80 border border-gray-700/50 rounded-2xl flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-300 font-medium mb-1">아직 프로젝트가 없습니다</p>
              <p className="text-gray-500 text-sm mb-6 max-w-xs leading-relaxed">
                첫 번째 프로젝트를 추가해 에이전트를 실행해 보세요.
              </p>
              <button
                onClick={handleAddProject}
                className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500
                           text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                새 프로젝트 추가
              </button>
            </div>
          )}

          {!isLoading && !isError && projects && projects.length > 0 &&
            projects.map(project => <ProjectRow key={project.id} project={project} />)}
        </div>
      </div>
      <AddProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
