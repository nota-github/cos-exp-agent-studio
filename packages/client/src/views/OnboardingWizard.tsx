export default function OnboardingWizard() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
      <div className="w-full max-w-lg px-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-bold">1</div>
          <div className="flex-1 h-px bg-gray-800" />
          <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">2</div>
          <div className="flex-1 h-px bg-gray-800" />
          <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">3</div>
          <div className="flex-1 h-px bg-gray-800" />
          <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">4</div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Agent Studio 설정</h1>
        <p className="text-gray-500 text-sm">OnboardingWizard — 초기 설정 마법사</p>
      </div>
    </div>
  )
}
