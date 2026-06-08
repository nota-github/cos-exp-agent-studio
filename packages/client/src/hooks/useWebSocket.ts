import { useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useLogStore, type LogEntry } from '../stores/logStore'

export type WsMessage = Record<string, unknown>
type MessageHandler = (message: WsMessage) => void

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3000/ws'
const MAX_RECONNECT_DELAY = 30_000

// Module-level singleton state — one connection for the app lifetime
let wsInstance: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let currentDelay = 1000
const messageHandlers = new Set<MessageHandler>()

function connect(): void {
  if (
    wsInstance &&
    (wsInstance.readyState === WebSocket.CONNECTING ||
      wsInstance.readyState === WebSocket.OPEN)
  ) {
    return
  }

  const ws = new WebSocket(WS_URL)
  wsInstance = ws

  ws.onopen = () => {
    console.log('[ws] WebSocket connected')
    currentDelay = 1000
    useAppStore.getState().setWsConnected(true)
    useAppStore.getState().setReconnectAttempts(0)
    if (reconnectTimeout !== null) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
  }

  ws.onclose = () => {
    useAppStore.getState().setWsConnected(false)
    scheduleReconnect()
  }

  ws.onerror = () => {
    // onclose fires after onerror — reconnect handled there
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string) as WsMessage
      for (const handler of messageHandlers) {
        handler(message)
      }
      if (
        message.type === 'log' &&
        typeof message.executionId === 'string' &&
        Array.isArray(message.data)
      ) {
        useLogStore.getState().appendLogs(message.executionId, message.data as LogEntry[])
      }
    } catch {
      // ignore malformed messages
    }
  }
}

function scheduleReconnect(): void {
  const store = useAppStore.getState()
  const nextAttempts = store.reconnectAttempts + 1
  store.setReconnectAttempts(nextAttempts)
  console.log(`[ws] reconnecting in ${currentDelay}ms (attempt ${nextAttempts})`)

  reconnectTimeout = setTimeout(() => {
    currentDelay = Math.min(currentDelay * 2, MAX_RECONNECT_DELAY)
    connect()
  }, currentDelay)
}

export function send(message: unknown): void {
  if (wsInstance?.readyState === WebSocket.OPEN) {
    wsInstance.send(JSON.stringify(message))
  }
}

/** Mounts the singleton WebSocket connection. Call once near the app root. */
export function useWebSocket(): { send: typeof send } {
  useEffect(() => {
    connect()
    // Intentionally no cleanup — singleton persists for app lifetime
  }, [])

  return { send }
}

/** Subscribe to incoming WebSocket messages for the component lifetime. */
export function useWsMessage(handler: MessageHandler): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const stable: MessageHandler = (msg) => handlerRef.current(msg)
    messageHandlers.add(stable)
    return () => {
      messageHandlers.delete(stable)
    }
  }, [])
}
