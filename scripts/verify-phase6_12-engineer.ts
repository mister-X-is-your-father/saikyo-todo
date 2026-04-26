/**
 * Phase 6.12 検証 — Engineer Agent (worktree + mock claude runner)
 *
 * 1. 一時 git repo を作る
 * 2. user + ws + item を作る
 * 3. engineerService.runForItem に DI runner を渡す (worktree 内に new file を書く)
 * 4. result が ok / changedFiles / commitSha が立つ
 * 5. agent_invocations に completed row が記録される
 * 6. worktree が後始末されて main 1 本に戻る
 *
 * autoPr=false で実行 (gh pr create は使わない)。
 *
 * 実行:
 *   NODE_OPTIONS="--conditions=react-server" \
 *     pnpm tsx --env-file=.env.local scripts/verify-phase6_12-engineer.ts
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

interface CheckResult {
  step: string
  ok: boolean
  note: string
}
const results: CheckResult[] = []
const pass = (s: string, n: string) => {
  results.push({ step: s, ok: true, note: n })
  console.log(`  [✓] ${s} — ${n}`)
}
const fail = (s: string, n: string) => {
  results.push({ step: s, ok: false, note: n })
  console.log(`  [✗] ${s} — ${n}`)
}

function makeTempRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'saikyo-eng-verify-'))
  const run = (...args: string[]) => execFileSync('git', args, { cwd: dir })
  run('init', '-q', '-b', 'main')
  run('config', 'user.email', 'verify@example.com')
  run('config', 'user.name', 'verify')
  writeFileSync(join(dir, 'README.md'), '# verify\n')
  run('add', 'README.md')
  run('commit', '-q', '-m', 'init')
  return {
    dir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    },
  }
}

async function main() {
  const repo = makeTempRepo()
  pass('temp git repo 作成', repo.dir)

  const stamp = Date.now()
  const email = `eng-${stamp}@example.com`
  const password = 'password1234'
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (cu.error || !cu.data.user) throw cu.error
  const userId = cu.data.user.id

  const userClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  await userClient.auth.signInWithPassword({ email, password })
  const { data: wsId } = await userClient.rpc('create_workspace', {
    ws_name: 'engineer 検証',
    ws_slug: `eng-${stamp}`,
  })
  const workspaceId = wsId as string

  try {
    // item を直挿入
    const { data: itemRow } = await admin
      .from('items')
      .insert({
        workspace_id: workspaceId,
        title: 'README に hello.txt の説明を 1 行加える',
        description:
          'README.md に "see hello.txt for example" の 1 行を追記し、hello.txt を新規作成する',
        dod: 'README に追記がある + hello.txt が存在する',
        is_must: false,
        priority: 3,
        created_by_actor_type: 'user',
        created_by_actor_id: userId,
      })
      .select('id')
      .single()
    const itemId = itemRow!.id as string
    pass('item 作成', itemId.slice(0, 8))

    // engineerService 呼び出し (mock runner)
    const { engineerService } = await import('@/features/agent/engineer-service')
    const r = await engineerService.runForItem({
      workspaceId,
      itemId,
      repoRoot: repo.dir,
      idempotencyKey: 'verify-' + Math.random(),
      autoPr: false,
      runner: async ({ worktreeDir, userMessage, systemPrompt, model }) => {
        // worktree に hello.txt を書き、README を更新する
        writeFileSync(join(worktreeDir, 'hello.txt'), 'hello from engineer\n')
        const fs = await import('node:fs/promises')
        const readme = await fs.readFile(join(worktreeDir, 'README.md'), 'utf8')
        await fs.writeFile(join(worktreeDir, 'README.md'), readme + '\nsee hello.txt for example\n')
        return {
          finalText: `done. system_prompt_chars=${systemPrompt.length} user_message_chars=${userMessage.length} model=${model}`,
          numTurns: 3,
          toolCallCount: 5,
          totalCostUsd: 0.0042,
          inputTokens: 1234,
          outputTokens: 567,
          cacheCreationTokens: 100,
          cacheReadTokens: 200,
        }
      },
    })

    if (!r.ok) {
      fail('runForItem 実行', r.error.message)
      return
    }
    pass('runForItem 実行', `commit=${r.value.commitSha?.slice(0, 8) ?? 'none'}`)

    // assertions
    if (r.value.changedFiles.includes('hello.txt') && r.value.changedFiles.includes('README.md')) {
      pass('changedFiles に 2 ファイル含有', r.value.changedFiles.join(', '))
    } else {
      fail(
        'changedFiles',
        `expected hello.txt + README.md, got: ${r.value.changedFiles.join(', ')}`,
      )
    }
    if (r.value.commitSha && r.value.commitSha.length === 40)
      pass('commit 作成', r.value.commitSha.slice(0, 12))
    else fail('commit 作成', String(r.value.commitSha))
    if (r.value.prUrl === null) pass('prUrl 未設定 (autoPr=false)', 'OK')
    else fail('prUrl 未設定', `prUrl=${r.value.prUrl}`)
    if (r.value.text.includes('done.')) pass('Engineer 出力 text', '"done." を含有')
    else fail('Engineer 出力 text', r.value.text.slice(0, 100))

    // agent_invocations row
    const { data: inv } = await admin
      .from('agent_invocations')
      .select('status, target_item_id, cost_usd, input_tokens, output_tokens, output')
      .eq('id', r.value.invocationId)
      .single()
    if (inv?.status === 'completed') pass('agent_invocations.status', 'completed')
    else fail('agent_invocations.status', String(inv?.status))
    if (inv?.target_item_id === itemId) pass('agent_invocations.target_item_id', 'OK')
    else fail('agent_invocations.target_item_id', String(inv?.target_item_id))
    if (Number(inv?.cost_usd) > 0) pass('agent_invocations.cost_usd', String(inv?.cost_usd))
    else fail('agent_invocations.cost_usd', String(inv?.cost_usd))
    const out = inv?.output as { changedFiles?: string[]; commitSha?: string; via?: string } | null
    if (out?.via === 'engineer-cli' && (out.changedFiles?.length ?? 0) >= 2) {
      pass('output JSON', `via=engineer-cli files=${out.changedFiles?.length}`)
    } else {
      fail('output JSON', JSON.stringify(out).slice(0, 200))
    }

    // worktree 後始末
    const wtList = execFileSync('git', ['worktree', 'list'], { cwd: repo.dir }).toString().trim()
    if (wtList.split('\n').length === 1) pass('worktree 後始末', '1 本に戻った')
    else fail('worktree 後始末', wtList)

    // 一時ブランチ削除
    const branches = execFileSync('git', ['branch', '--list'], { cwd: repo.dir }).toString().trim()
    if (!branches.includes('engineer/'))
      pass('engineer/ ブランチ削除済', branches.replace(/\s+/g, ' '))
    else fail('engineer/ ブランチ削除済', branches)
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    repo.cleanup()
  }

  console.log('\n=== 結果 ===')
  const ok = results.filter((r) => r.ok).length
  const total = results.length
  console.log(`PASS: ${ok}/${total}`)
  if (ok < total) process.exit(1)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
