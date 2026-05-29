/**
 * Phase 6.15 loop iter1489 (mode-F = Flicker detection、Add 系):
 * useCreateTimeEntry 楽観 append。
 *
 * Bug: useCreateTimeEntry (src/features/time-entry/hooks.ts) は onSuccess invalidate
 * のみで onMutate 楽観 update を持たず、/time-entries で TimeEntry 作成後 ~200-500ms
 * 待ちで entry が一覧に現れない flicker
 * (useCreateSchedule iter1477 と同 root cause、TimeEntry 版)。
 *
 * 修正: temp id ('temp-' + crypto.randomUUID()) で仮 entry append (userId 空文字、
 * server canonical fetch で正規 id / userId に上書き)、リスト先頭に挿入 (新着順)。
 * fire-and-forget cancelQueries + snapshot rollback + onSettled invalidate。
 *
 * 経路 B: source-side regex assert。
 *
 * 実行: pnpm tsx --env-file=.env.local \
 *         scripts/explore-uiux-flicker-add-time-entry-iter1489.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

function main(): void {
  const findings: Finding[] = []

  const src = readFileSync(resolve(process.cwd(), 'src/features/time-entry/hooks.ts'), 'utf8')

  if (!src.includes('id: `temp-${crypto.randomUUID()}`')) {
    findings.push({
      level: 'error',
      message: 'time-entry/hooks.ts: useCreateTimeEntry temp id 不在',
    })
  }
  if (!src.includes('[tempEntry, ...snapshot]')) {
    findings.push({
      level: 'error',
      message: 'time-entry/hooks.ts: 先頭挿入 (新着順) 不在',
    })
  }

  console.log(`\n=== Findings (iter1489 CreateTimeEntry flicker fix) ===`)
  if (findings.length === 0) console.log('(なし) — useCreateTimeEntry temp id + 先頭挿入 OK')
  else for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main()
