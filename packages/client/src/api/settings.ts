import { apiGet, apiPut, apiPost } from './client'

export interface SettingsConfig {
  cliPath: string
  defaultModel: string
  defaultProjectFolder: string
  runOptions: string
  historyRetentionCount: number
  apiKey: string
  apiKeySet: boolean
}

export interface TestResult {
  ok: boolean
  output: string
  error?: string
}

export function getSettings(): Promise<SettingsConfig> {
  return apiGet<SettingsConfig>('/settings')
}

export function saveSettings(data: Partial<SettingsConfig>): Promise<SettingsConfig> {
  return apiPut<SettingsConfig>('/settings', data)
}

export function testCli(): Promise<TestResult> {
  return apiPost<TestResult>('/settings/test')
}
