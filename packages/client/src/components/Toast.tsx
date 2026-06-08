import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
  duration?: number
}

export default function Toast({ message, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 bg-gray-800 border border-gray-600 text-gray-100 text-sm rounded-lg shadow-xl whitespace-nowrap">
      {message}
    </div>
  )
}
