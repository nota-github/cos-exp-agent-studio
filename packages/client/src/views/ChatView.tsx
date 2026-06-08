export default function ChatView() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside className="w-64 border-r border-gray-800 flex-shrink-0 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <span className="text-sm font-semibold text-gray-300">프로젝트</span>
        </div>
        <div className="flex-1" />
        <div className="px-4 py-3 border-t border-gray-800">
          <span className="text-xs text-gray-600">설정</span>
        </div>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <span className="text-sm font-medium text-gray-300">프로젝트 이름</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">ChatView — 채팅/실행 화면</p>
        </div>
        <div className="px-6 py-4 border-t border-gray-800">
          <div className="w-full h-10 bg-gray-900 rounded-lg border border-gray-700" />
        </div>
      </div>
    </div>
  )
}
