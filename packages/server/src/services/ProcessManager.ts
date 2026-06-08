import { EventEmitter } from 'events'
import { spawn as nodeSpawn, type ChildProcess } from 'child_process'
import { db } from '../db/index.js'

export type ProcessStatus = 'running' | 'exited' | 'killed' | 'error'

interface ManagedProcess {
  child: ChildProcess
  status: ProcessStatus
  killTimer: ReturnType<typeof setTimeout> | null
  paused: boolean
}

export declare interface ProcessManager {
  on(event: 'data', listener: (executionId: string, chunk: string, source: 'stdout' | 'stderr') => void): this
  on(event: 'exit', listener: (executionId: string, code: number | null, signal: NodeJS.Signals | null) => void): this
  emit(event: 'data', executionId: string, chunk: string, source: 'stdout' | 'stderr'): boolean
  emit(event: 'exit', executionId: string, code: number | null, signal: NodeJS.Signals | null): boolean
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>()

  spawn(
    executionId: string,
    command: string,
    args: string[],
    cwd: string,
    env: NodeJS.ProcessEnv = process.env
  ): void {
    if (this.processes.has(executionId)) {
      throw new Error('Execution already managed: ' + executionId)
    }

    const child = nodeSpawn(command, args, {
      shell: false,
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const managed: ManagedProcess = { child, status: 'running', killTimer: null, paused: false }
    this.processes.set(executionId, managed)

    child.stdout?.on('data', (chunk: Buffer) => {
      this.emit('data', executionId, chunk.toString(), 'stdout')
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      this.emit('data', executionId, chunk.toString(), 'stderr')
    })

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      const m = this.processes.get(executionId)
      if (m) {
        if (m.killTimer !== null) {
          clearTimeout(m.killTimer)
          m.killTimer = null
        }
        m.status = signal ? 'killed' : code === 0 ? 'exited' : 'error'
      }
      this.emit('exit', executionId, code, signal)
    })

    child.on('error', (_err: Error) => {
      const m = this.processes.get(executionId)
      if (m) {
        if (m.killTimer !== null) {
          clearTimeout(m.killTimer)
          m.killTimer = null
        }
        m.status = 'error'
      }
      this.emit('exit', executionId, null, null)
    })
  }

  kill(executionId: string): void {
    const managed = this.processes.get(executionId)
    if (!managed || managed.status !== 'running') return

    managed.child.kill('SIGTERM')

    managed.killTimer = setTimeout(() => {
      const m = this.processes.get(executionId)
      if (m && m.status === 'running') {
        m.child.kill('SIGKILL')
      }
    }, 5_000)
  }

  pause(executionId: string): void {
    const managed = this.processes.get(executionId)
    if (managed) managed.paused = true
  }

  resume(executionId: string): void {
    const managed = this.processes.get(executionId)
    if (managed) managed.paused = false
  }

  write(executionId: string, data: string): void {
    const managed = this.processes.get(executionId)
    if (!managed || managed.status !== 'running' || managed.paused) return
    managed.child.stdin?.write(data)
  }

  getStatus(executionId: string): ProcessStatus | null {
    return this.processes.get(executionId)?.status ?? null
  }
}

export const processManager = new ProcessManager()

export function cleanupOrphanedExecutions(): void {
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE executions
    SET status = 'failed',
        error_message = '서버 재시작으로 인해 중단됨',
        completed_at = ?
    WHERE status IN ('running', 'pending', 'approval_pending')
  `).run(now)
}
