export default function ProjectInboxView() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <div className="w-1 bg-indigo-600 flex-shrink-0" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h1 className="text-lg font-semibold text-white">Agent Studio</h1>
          <button className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md">
            새 프로젝트 추가
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">ProjectInboxView — 프로젝트 목록 화면</p>
        </div>
      </div>
    </div>
  )
}
