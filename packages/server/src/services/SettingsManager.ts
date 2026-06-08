import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const CONFIG_DIR = join(homedir(), '.agent-studio')
const SETTINGS_FILE = join(CONFIG_DIR, 'settings.json')

export interface Settings {
  cli_path?: string
  api_key?: string
  model?: string
  default_project_path?: string
  extra_args?: string[]
}

class SettingsManager {
  private settings: Settings = {}

  constructor() {
    this.load()
  }

  private load(): void {
    if (!existsSync(SETTINGS_FILE)) return
    try {
      this.settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8')) as Settings
    } catch {
      this.settings = {}
    }
  }

  getSettings(): Settings {
    return { ...this.settings }
  }

  save(updates: Partial<Settings>): void {
    this.settings = { ...this.settings, ...updates }
    mkdirSync(CONFIG_DIR, { recursive: true })
    writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8')
  }

  isConfigured(): { configured: boolean; missing: string[] } {
    const missing: string[] = []
    if (!this.settings.cli_path) missing.push('cli_path')
    const hasApiKey = !!this.settings.api_key || !!process.env.ANTHROPIC_API_KEY
    if (!hasApiKey) missing.push('api_key')
    return { configured: missing.length === 0, missing }
  }
}

export const settingsManager = new SettingsManager()
