import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'path'
import { tmpdir } from 'os'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { SettingsManager } from '../SettingsManager.js'

let testIndex = 0

function makeTmpDir(): string {
  testIndex += 1
  const dir = join(tmpdir(), 'agent-studio-test-' + String(testIndex))
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('SettingsManager', () => {
  describe('loadConfig()', () => {
    test('creates config.json with defaults when file does not exist', () => {
      const dir = makeTmpDir()
      try {
        const mgr = new SettingsManager(dir)
        const config = mgr.loadConfig()
        assert.strictEqual(config.cliPath, '')
        assert.strictEqual(config.defaultModel, '')
        assert.strictEqual(config.defaultProjectFolder, '')
        assert.strictEqual(config.runOptions, '')
        assert.strictEqual(config.historyRetentionCount, 100)

        assert.ok(existsSync(join(dir, 'config.json')), 'config.json should be created')
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })

    test('reads existing config.json and merges with defaults', () => {
      const dir = makeTmpDir()
      try {
        const existing = { cliPath: '/usr/bin/test', historyRetentionCount: 50 }
        writeFileSync(join(dir, 'config.json'), JSON.stringify(existing), 'utf-8')
        const mgr = new SettingsManager(dir)
        const config = mgr.loadConfig()
        assert.strictEqual(config.cliPath, '/usr/bin/test')
        assert.strictEqual(config.historyRetentionCount, 50)
        assert.strictEqual(config.defaultModel, '')
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  })

  describe('saveConfig()', () => {
    test('persists values readable by a new SettingsManager instance', () => {
      const dir = makeTmpDir()
      try {
        const mgr = new SettingsManager(dir)
        mgr.saveConfig({ cliPath: '/usr/bin/env', defaultModel: 'claude-sonnet-4-6' })

        const mgr2 = new SettingsManager(dir)
        const config = mgr2.loadConfig()
        assert.strictEqual(config.cliPath, '/usr/bin/env')
        assert.strictEqual(config.defaultModel, 'claude-sonnet-4-6')
        assert.strictEqual(config.historyRetentionCount, 100)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  })

  describe('isConfigured()', () => {
    test('returns ok=false with cli_path in missing when cliPath is empty', async () => {
      const dir = makeTmpDir()
      try {
        const mgr = new SettingsManager(dir)
        const result = await mgr.isConfigured()
        assert.strictEqual(result.ok, false)
        assert.ok(result.missing.includes('cli_path'))
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })

    test('returns ok=false with cli_path when cliPath path does not exist', async () => {
      const dir = makeTmpDir()
      try {
        const mgr = new SettingsManager(dir)
        mgr.saveConfig({ cliPath: '/nonexistent/path/to/tool' })
        const result = await mgr.isConfigured()
        assert.strictEqual(result.ok, false)
        assert.ok(result.missing.includes('cli_path'))
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })

    test('returns ok=false with api_key in missing when cliPath is executable but no API key', async () => {
      const dir = makeTmpDir()
      const savedEnv = process.env.AGENT_STUDIO_API_KEY
      try {
        delete process.env.AGENT_STUDIO_API_KEY
        const mgr = new SettingsManager(dir)
        mgr.saveConfig({ cliPath: '/usr/bin/env' })
        const result = await mgr.isConfigured()
        assert.strictEqual(result.ok, false)
        assert.ok(result.missing.includes('api_key'), 'api_key should be missing')
        assert.ok(!result.missing.includes('cli_path'), 'cli_path should NOT be missing')
      } finally {
        if (savedEnv !== undefined) process.env.AGENT_STUDIO_API_KEY = savedEnv
        rmSync(dir, { recursive: true, force: true })
      }
    })
  })
})

// GUIDED_VERIFICATION_REQUIRED — AC3: setApiKey/getApiKey via real OS keychain
// Manual test: call setApiKey('sk-test') then getApiKey() — verify value in macOS Keychain Access
// under service 'agent-studio', account 'api-key'.

// GUIDED_VERIFICATION_REQUIRED — AC4: getApiKey() env var fallback when keytar throws
// Requires making keytar.getPassword throw at runtime (e.g. libsecret missing on Linux or mock).
// Set AGENT_STUDIO_API_KEY=sk-fallback, cause keytar to throw, verify getApiKey() returns 'sk-fallback'
// and console.warn is emitted.
