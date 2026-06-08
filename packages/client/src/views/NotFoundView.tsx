import { Link } from 'react-router-dom'

export default function NotFoundView() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-800 mb-4">404</p>
        <p className="text-gray-400 mb-6">페이지를 찾을 수 없습니다</p>
        <Link
          to="/projects"
          className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2"
        >
          프로젝트 목록으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
