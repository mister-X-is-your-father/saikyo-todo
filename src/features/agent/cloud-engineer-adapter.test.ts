import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  chooseEngineerRunner,
  CloudEngineerEnvError,
  loadEnvForCloudEngineer,
} from './cloud-engineer-adapter'

const KEYS = [
  'SAIKYO_ENGINEER_GIT_REPO_URL',
  'SAIKYO_ENGINEER_GITHUB_TOKEN',
  'SAIKYO_ENGINEER_GIT_REF',
  'SAIKYO_ENGINEER_GIT_AUTHOR_NAME',
  'SAIKYO_ENGINEER_GIT_AUTHOR_EMAIL',
  'CLAUDE_CREDENTIALS_PATH',
  'SAIKYO_ENGINEER_TEMPLATE',
] as const

describe('cloud-engineer-adapter (iter 244)', () => {
  const original: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const k of KEYS) {
      original[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k]
      else process.env[k] = original[k]
    }
  })

  it('SAIKYO_ENGINEER_GIT_REPO_URL 未設定で CloudEngineerEnvError', async () => {
    process.env.SAIKYO_ENGINEER_GITHUB_TOKEN = 'ghp_xxx'
    await expect(loadEnvForCloudEngineer()).rejects.toBeInstanceOf(CloudEngineerEnvError)
  })

  it('SAIKYO_ENGINEER_GITHUB_TOKEN 未設定で CloudEngineerEnvError', async () => {
    process.env.SAIKYO_ENGINEER_GIT_REPO_URL = 'https://github.com/o/r.git'
    await expect(loadEnvForCloudEngineer()).rejects.toBeInstanceOf(CloudEngineerEnvError)
  })

  it('CLAUDE_CREDENTIALS_PATH の指す path が無いと CloudEngineerEnvError', async () => {
    process.env.SAIKYO_ENGINEER_GIT_REPO_URL = 'https://github.com/o/r.git'
    process.env.SAIKYO_ENGINEER_GITHUB_TOKEN = 'ghp_xxx'
    process.env.CLAUDE_CREDENTIALS_PATH = '/tmp/this-does-not-exist-iter244-xyz.json'
    await expect(loadEnvForCloudEngineer()).rejects.toBeInstanceOf(CloudEngineerEnvError)
  })

  it('CloudEngineerEnvError は AppError 互換 (code / message)', async () => {
    try {
      await loadEnvForCloudEngineer()
      expect.fail('should throw')
    } catch (err) {
      expect(err).toBeInstanceOf(CloudEngineerEnvError)
      const e = err as CloudEngineerEnvError
      expect(e.code).toBe('cloud-engineer-env-error')
      expect(e.message).toContain('SAIKYO_ENGINEER')
    }
  })
})

describe('loadEnvForCloudEngineer template (iter 246)', () => {
  const original: Record<string, string | undefined> = {}
  let tmpCredFile = ''

  beforeEach(async () => {
    for (const k of KEYS) {
      original[k] = process.env[k]
      delete process.env[k]
    }
    // 必須 env を min 集めて template だけ別 assert する
    process.env.SAIKYO_ENGINEER_GIT_REPO_URL = 'https://github.com/o/r.git'
    process.env.SAIKYO_ENGINEER_GITHUB_TOKEN = 'ghp_xxx'
    // 一時的な credentials ファイルを作る
    const { writeFile, mkdtemp } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = await mkdtemp(join(tmpdir(), 'saikyo-cred-iter246-'))
    tmpCredFile = join(dir, 'credentials.json')
    await writeFile(tmpCredFile, '{"x":"y"}')
    process.env.CLAUDE_CREDENTIALS_PATH = tmpCredFile
  })

  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k]
      else process.env[k] = original[k]
    }
  })

  it('SAIKYO_ENGINEER_TEMPLATE 未設定 → template=undefined (default base 使用)', async () => {
    const env = await loadEnvForCloudEngineer()
    expect(env.template).toBeUndefined()
  })

  it("SAIKYO_ENGINEER_TEMPLATE='saikyo-engineer' → template='saikyo-engineer'", async () => {
    process.env.SAIKYO_ENGINEER_TEMPLATE = 'saikyo-engineer'
    const env = await loadEnvForCloudEngineer()
    expect(env.template).toBe('saikyo-engineer')
  })

  it('SAIKYO_ENGINEER_TEMPLATE が空文字 → template=undefined (空 string で潜り込まない)', async () => {
    process.env.SAIKYO_ENGINEER_TEMPLATE = ''
    const env = await loadEnvForCloudEngineer()
    expect(env.template).toBeUndefined()
  })
})

describe('chooseEngineerRunner (iter 245)', () => {
  it("env 未設定 → 'local'", () => {
    expect(chooseEngineerRunner({})).toBe('local')
  })

  it("SAIKYO_ENGINEER_USE_CLOUD_SANDBOX='true' → 'cloud'", () => {
    expect(chooseEngineerRunner({ SAIKYO_ENGINEER_USE_CLOUD_SANDBOX: 'true' })).toBe('cloud')
  })

  it("'TRUE' (大文字) は cloud にしない (厳格 match)", () => {
    expect(chooseEngineerRunner({ SAIKYO_ENGINEER_USE_CLOUD_SANDBOX: 'TRUE' })).toBe('local')
  })

  it("'1' は cloud にしない (誤入力事故防止)", () => {
    expect(chooseEngineerRunner({ SAIKYO_ENGINEER_USE_CLOUD_SANDBOX: '1' })).toBe('local')
  })

  it("'false' / '' / 任意の他文字列は 'local'", () => {
    expect(chooseEngineerRunner({ SAIKYO_ENGINEER_USE_CLOUD_SANDBOX: 'false' })).toBe('local')
    expect(chooseEngineerRunner({ SAIKYO_ENGINEER_USE_CLOUD_SANDBOX: '' })).toBe('local')
    expect(chooseEngineerRunner({ SAIKYO_ENGINEER_USE_CLOUD_SANDBOX: 'yes' })).toBe('local')
  })
})
