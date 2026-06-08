import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { ProcessManager, cleanupOrphanedExecutions } from '../ProcessManager.js'
import { db } from '../../db/index.js'

describe('ProcessManager', () => {
  test('spawn emits data event with stdout content', async () => {
    const pm = new ProcessManager()
    const chunks: string[] = []

    await new Promise<void>((resolve, reject) => {
      pm.on('data', (_id, chunk, source) => {
        if (source === 'stdout') chunks.push(chunk)
      })
      pm.on('exit', (_id, _code) => {
        try {
          assert.ok(chunks.join('').includes('hello'), 'stdout should contain hello')
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      pm.spawn('exec-data', 'echo', ['hello'], '/tmp')
    })
  })

  test('kill terminates process within 6 seconds', { timeout: 8000 }, async () => {
    const pm = new ProcessManager()
    const start = Date.now()

    await new Promise<void>((resolve, reject) => {
      pm.on('exit', (_id) => {
        try {
          const elapsed = Date.now() - start
          assert.ok(elapsed < 6000, `process should exit within 6s but took ${elapsed}ms`)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      pm.spawn('exec-kill', 'sleep', ['60'], '/tmp')
      setTimeout(() => pm.kill('exec-kill'), 100)
    })
  })

  test('write sends data to stdin and process emits it on stdout', { timeout: 5000 }, async () => {
    const pm = new ProcessManager()
    const output: string[] = []

    await new Promise<void>((resolve, reject) => {
      pm.on('data', (_id, chunk, source) => {
        if (source === 'stdout') output.push(chunk)
      })
      pm.on('exit', (_id, _code) => {
        try {
          assert.ok(output.join('').includes('hello-stdin'), 'stdout should echo stdin data')
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      pm.spawn(
        'exec-write',
        'node',
        ['-e', "process.stdin.once('data',(d)=>{process.stdout.write(d);process.exit(0)})"],
        '/tmp'
      )
      pm.write('exec-write', 'hello-stdin\n')
    })
  })

  test('multiple concurrent processes are isolated', async () => {
    const pm = new ProcessManager()
    const output: Record<string, string[]> = { 'exec-a': [], 'exec-b': [] }

    pm.on('data', (id, chunk, source) => {
      if (source === 'stdout' && output[id]) output[id].push(chunk)
    })

    await new Promise<void>((resolve, reject) => {
      let done = 0
      pm.on('exit', (id) => {
        try {
          if (id === 'exec-a' || id === 'exec-b') {
            done++
            if (done === 2) resolve()
          }
        } catch (e) {
          reject(e)
        }
      })
      pm.spawn('exec-a', 'echo', ['process-one'], '/tmp')
      pm.spawn('exec-b', 'echo', ['process-two'], '/tmp')
    })

    const outA = output['exec-a'].join('')
    const outB = output['exec-b'].join('')
    assert.ok(outA.includes('process-one'), 'exec-a should contain process-one')
    assert.ok(!outA.includes('process-two'), 'exec-a should not contain process-two')
    assert.ok(outB.includes('process-two'), 'exec-b should contain process-two')
    assert.ok(!outB.includes('process-one'), 'exec-b should not contain process-one')
  })
})

describe('cleanupOrphanedExecutions', () => {
  test('marks running and pending executions as failed on startup', () => {
    const now = new Date().toISOString()
    const projectId = 'pm-test-proj-cleanup'
    const runningId = 'pm-exec-running'
    const pendingId = 'pm-exec-pending'
    const completedId = 'pm-exec-completed'

    db.prepare(
      'INSERT OR IGNORE INTO projects (id, name, path, created_at) VALUES (?, ?, ?, ?)'
    ).run(projectId, 'PM Test', '/tmp/pm-test', now)

    const ins = db.prepare(
      'INSERT OR REPLACE INTO executions (id, project_id, request_text, status, started_at) VALUES (?, ?, ?, ?, ?)'
    )
    ins.run(runningId, projectId, 'req', 'running', now)
    ins.run(pendingId, projectId, 'req', 'pending', null)
    ins.run(completedId, projectId, 'req', 'completed', now)

    cleanupOrphanedExecutions()

    type Row = { status: string; error_message: string | null }
    const q = db.prepare<[string], Row>('SELECT status, error_message FROM executions WHERE id = ?')

    const running = q.get(runningId)
    const pending = q.get(pendingId)
    const completed = q.get(completedId)

    assert.strictEqual(running?.status, 'failed')
    assert.strictEqual(pending?.status, 'failed')
    assert.strictEqual(running?.error_message, '서버 재시작으로 인해 중단됨')
    assert.strictEqual(pending?.error_message, '서버 재시작으로 인해 중단됨')
    assert.strictEqual(completed?.status, 'completed')

    db.prepare('DELETE FROM executions WHERE id IN (?, ?, ?)').run(runningId, pendingId, completedId)
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId)
  })
})
