import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildClaudeRunScript,
  CloudSandboxConfigError,
  runClaudeOnRepo,
  runViaCloudSandbox,
} from './cloud-sandbox-runner'

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

describe('buildClaudeRunScript (iter 241)', () => {
  it('credentials 復元 / claude CLI install / git clone / claude --print の 4 step を含む', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/owner/repo.git',
      gitRef: 'main',
      prompt: 'fix the bug',
    })
    expect(script).toContain('set -euo pipefail')
    expect(script).toContain('CLAUDE_CREDENTIALS_B64')
    expect(script).toContain('npm install -g @anthropic-ai/claude-code')
    expect(script).toContain('git clone')
    expect(script).toContain('claude --print')
  })

  it('GITHUB_TOKEN を git URL に oauth2 形式で埋め込む', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/owner/repo.git',
      gitRef: 'main',
      prompt: 'x',
    })
    expect(script).toContain('https://oauth2:$GITHUB_TOKEN@github.com/owner/repo.git')
  })

  it('prompt は base64 経由で渡され、改行 / クォート / 日本語に安全', () => {
    const tricky = '日本語 + "double" + \'single\' + 改\n行'
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/owner/repo.git',
      gitRef: 'main',
      prompt: tricky,
    })
    const expected = Buffer.from(tricky, 'utf8').toString('base64')
    expect(script).toContain(expected)
    // 生 prompt が直接入って quote バグらないこと
    expect(script).not.toContain(tricky)
  })

  it('指定 ref で checkout する', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'feature/xyz',
      prompt: 'p',
    })
    expect(script).toContain('git checkout "feature/xyz"')
  })

  it('runClaudeOnRepo も E2B_API_KEY 未設定で CloudSandboxConfigError', async () => {
    await expect(
      runClaudeOnRepo({
        invocationId: 'i-1',
        workspaceId: 'w-1',
        itemId: 'it-1',
        gitRepoUrl: 'https://github.com/o/r.git',
        gitRef: 'main',
        githubToken: 'gh_xxx',
        prompt: 'p',
        claudeCredentialsB64: 'eyJ4Ijoid'.repeat(10),
      }),
    ).rejects.toBeInstanceOf(CloudSandboxConfigError)
  })

  // iter 242: verify mode
  it('verify=none で typecheck / lint / pnpm install を含まない', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      verify: 'none',
    })
    expect(script).not.toContain('pnpm typecheck')
    expect(script).not.toContain('pnpm lint')
    expect(script).not.toContain('pnpm install')
  })

  it('verify=fast (default) で typecheck + lint を含み、pnpm test は含まない', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      // default = 'fast'
    })
    expect(script).toContain('pnpm install --frozen-lockfile')
    expect(script).toContain('pnpm typecheck')
    expect(script).toContain('pnpm lint')
    expect(script).not.toContain('pnpm test')
  })

  it('verify=full で typecheck + lint + pnpm test を含む', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      verify: 'full',
    })
    expect(script).toContain('pnpm typecheck')
    expect(script).toContain('pnpm lint')
    expect(script).toContain('pnpm test')
  })

  // iter 243: autoMergeToMain (フル自動 α)
  it('autoMergeToMain=true で git add/commit/push を含む', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      autoMergeToMain: true,
    })
    expect(script).toContain('git add -A')
    expect(script).toContain('git commit -F /tmp/commit-msg.txt')
    expect(script).toContain('git push origin "main"')
  })

  it('autoMergeToMain=true でも 変更が無ければ no-op で push しない (空 commit ガード)', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      autoMergeToMain: true,
    })
    expect(script).toContain('if [ -z "$(git status --porcelain)" ]; then')
    expect(script).toContain('no changes')
  })

  it('autoMergeToMain=false (default) では push 系 step を含まない', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
    })
    expect(script).not.toContain('git push')
    expect(script).not.toContain('git commit -F')
  })

  it('commitMessage を base64 経由で渡し、改行 / 引用符に安全', () => {
    const tricky = 'fix: "bug"\n\n何かを修正'
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      autoMergeToMain: true,
      commitMessage: tricky,
    })
    const expected = Buffer.from(tricky, 'utf8').toString('base64')
    expect(script).toContain(expected)
    // 生 message は埋まらない
    expect(script).not.toContain(tricky)
  })

  it('gitAuthorName / Email を指定すると git config に反映', () => {
    const script = buildClaudeRunScript({
      gitRepoUrl: 'https://github.com/o/r.git',
      gitRef: 'main',
      prompt: 'x',
      autoMergeToMain: true,
      gitAuthorName: 'Engineer Bot',
      gitAuthorEmail: 'engineer@example.com',
    })
    expect(script).toContain('git config user.name "Engineer Bot"')
    expect(script).toContain('git config user.email "engineer@example.com"')
  })
})
