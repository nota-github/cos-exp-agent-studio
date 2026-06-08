import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, accessSync, constants } from 'fs'
import keytar from 'keytar'

const KEYCHAIN_SERVICE = 'agent-studio'
const KEYCHAIN_ACCOUNT = 'api-key'

export interface Config {
  cliPath: string
  defaultModel: string
  defaultProjectFolder: string
  runOptions: string
  historyRetentionCount: number
}

const DEFAULT_CONFIG: Config = {
  cliPath: '',
  defaultModel: '',
  defaultProjectFolder: '',
  runOptions: '',
  historyRetentionCount: 100,
}

export class SettingsManager {
  private readonly configDir: string
  private readonly configFile: string
  private config: Config = { ...DEFAULT_CONFIG }

  constructor(configDir?: string) {
    this.configDir = configDir ?? join(homedir(), '.agent-studio')
    this.configFile = join(this.configDir, 'config.json')
    this.loadConfig()
  }

  loadConfig(): Config {
    mkdirSync(this.configDir, { recursive: true })
    if (!existsSync(this.configFile)) {
      writeFileSync(this.configFile, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8')
      this.config = { ...DEFAULT_CONFIG }
    } else {
      try {
        const raw = JSON.parse(readFileSync(this.configFile, 'utf-8')) as Partial<Config>
        this.config = { ...DEFAULT_CONFIG, ...raw }
      } catch {
        this.config = { ...DEFAULT_CONFIG }
      }
    }
    return { ...this.config }
  }

  saveConfig(partial: Partial<Config>): void {
    this.config = { ...this.config, ...partial }
    mkdirSync(this.configDir, { recursive: true })
    writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf-8')
  }

  async getApiKey(): Promise<string | null> {
    try {
      return await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
    } catch {
      const envKey = process.env.AGENT_STUDIO_API_KEY ?? null
      if (envKey) {
        console.warn('[SettingsManager] keytar unavailable — falling back to AGENT_STUDIO_API_KEY env var')
      }
      return envKey
    }
  }

  async setApiKey(key: string): Promise<void> {
    await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, key)
  }

  async isConfigured(): Promise<{ ok: boolean; missing: string[] }> {
    const missing: string[] = []

    const { cliPath } = this.config
    if (!cliPath) {
      missing.push('cli_path')
    } else {
      try {
        accessSync(cliPath, constants.X_OK)
      } catch {
        missing.push('cli_path')
      }
    }

    const apiKey = await this.getApiKey()
    if (!apiKey) {
      missing.push('api_key')
    }

    return { ok: missing.length === 0, missing }
  }
}

export const settingsManager = new SettingsManager()
