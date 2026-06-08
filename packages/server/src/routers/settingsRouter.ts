import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { spawnSync } from 'child_process'
import { settingsManager } from '../services/SettingsManager.js'

const settingsRouter = Router()

const UpdateSettingsSchema = z.object({
  cliPath: z.string().optional(),
  defaultModel: z.string().optional(),
  defaultProjectFolder: z.string().optional(),
  runOptions: z.string().optional(),
  apiKey: z.string().optional(),
  historyRetentionCount: z.number().int().min(1).max(500).optional(),
})

async function buildMaskedConfig() {
  const config = settingsManager.loadConfig()
  const apiKey = await settingsManager.getApiKey()
  return {
    ...config,
    apiKey: apiKey ? '•••••' : '',
    apiKeySet: !!apiKey,
  }
}

settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const masked = await buildMaskedConfig()
    res.json(masked)
  } catch {
    res.status(500).json({ error: '설정을 불러오는 중 오류가 발생했습니다' })
  }
})

settingsRouter.put('/', async (req: Request, res: Response) => {
  const result = UpdateSettingsSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: '입력값이 올바르지 않습니다',
      details: result.error.flatten().fieldErrors,
    })
    return
  }

  const { apiKey, ...configFields } = result.data
  try {
    if (apiKey !== undefined) {
      await settingsManager.setApiKey(apiKey)
    }
    if (Object.keys(configFields).length > 0) {
      settingsManager.saveConfig(configFields)
    }
    const masked = await buildMaskedConfig()
    res.json(masked)
  } catch {
    res.status(500).json({ error: '설정 저장 중 오류가 발생했습니다' })
  }
})

settingsRouter.post('/test', (_req: Request, res: Response) => {
  const config = settingsManager.loadConfig()
  const { cliPath } = config
  if (!cliPath) {
    res.json({ ok: false, output: '', error: 'CLI 도구 경로가 설정되지 않았습니다' })
    return
  }
  try {
    const result = spawnSync(cliPath, ['--version'], {
      shell: false,
      timeout: 5000,
      encoding: 'utf-8',
    })
    if (result.error) {
      res.json({
        ok: false,
        output: '',
        error: `CLI 도구를 실행할 수 없습니다: ${result.error.message}`,
      })
      return
    }
    if (result.status !== 0) {
      const stderr = (result.stderr ?? '').trim()
      res.json({
        ok: false,
        output: result.stdout ?? '',
        error: `CLI 도구를 실행할 수 없습니다: ${stderr || `종료 코드 ${result.status}`}`,
      })
      return
    }
    res.json({ ok: true, output: (result.stdout ?? '').trim() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.json({ ok: false, output: '', error: `CLI 도구를 실행할 수 없습니다: ${message}` })
  }
})

settingsRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await settingsManager.isConfigured()
    res.json({ isConfigured: status.ok, missing: status.missing })
  } catch {
    res.status(500).json({ error: '설정 상태를 확인하는 중 오류가 발생했습니다' })
  }
})

export { settingsRouter }
