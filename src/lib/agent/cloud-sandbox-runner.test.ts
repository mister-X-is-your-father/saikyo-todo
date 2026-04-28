import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CloudSandboxConfigError, runViaCloudSandbox } from './cloud-sandbox-runner'

describe('cloud-sandbox-runner', () => {
  const ORIGINAL_API_KEY = process.env.E2B_API_KEY

  beforeEach(() => {
    delete process.env.E2B_API_KEY
  })

  afterEach(() => {
    if (ORIGINAL_API_KEY === undefined) delete process.env.E2B_API_KEY
    else process.env.E2B_API_KEY = ORIGINAL_API_KEY
  })

  it('E2B_API_KEY 未設定で CloudSandboxConfigError を投げる (caller の設定漏れ)', async () => {
    await expect(
      runViaCloudSandbox({
        invocationId: 'test-1',
        workspaceId: 'ws-1',
        itemId: 'item-1',
        prompt: 'hello',
        autoMergeToMain: false,
      }),
    ).rejects.toBeInstanceOf(CloudSandboxConfigError)
  })

  it('CloudSandboxConfigError は AppError 互換 (code / message を持つ)', async () => {
    try {
      await runViaCloudSandbox({
        invocationId: 'test-2',
        workspaceId: 'ws-1',
        itemId: 'item-1',
        prompt: 'hello',
        autoMergeToMain: false,
      })
      expect.fail('should throw')
    } catch (err) {
      expect(err).toBeInstanceOf(CloudSandboxConfigError)
      const e = err as CloudSandboxConfigError
      expect(e.code).toBe('cloud-sandbox-config-error')
      expect(e.message).toContain('E2B_API_KEY')
    }
  })

  // 実 sandbox 起動テストは E2B_API_KEY 必須なので CI / live でのみ。
  // ここでは env validation path だけ。実装は iter 241+ で integration test を追加。
})
