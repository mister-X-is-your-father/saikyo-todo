import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CloudEngineerEnvError, loadEnvForCloudEngineer } from './cloud-engineer-adapter'

const KEYS = [
  'SAIKYO_ENGINEER_GIT_REPO_URL',
  'SAIKYO_ENGINEER_GITHUB_TOKEN',
  'SAIKYO_ENGINEER_GIT_REF',
  'SAIKYO_ENGINEER_GIT_AUTHOR_NAME',
  'SAIKYO_ENGINEER_GIT_AUTHOR_EMAIL',
  'CLAUDE_CREDENTIALS_PATH',
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
