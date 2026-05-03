/**
 * Phase 6.15 loop iter 658 (mode-D Desktop a11y) —
 * kanban-view ItemDecomposeButton wrapper を keyboard focus でも reveal
 * (group-focus-within:opacity-100 追加、tab nav で見えない button 解消)。
 *
 * 課題: kanban-view.tsx 行 395-400 の Kanban card 内 ItemDecomposeButton wrapper は
 *   `opacity-0 transition-opacity group-hover:opacity-100` で mouse hover でのみ
 *   reveal される。keyboard で Tab ナビゲートすると button に focus は当たるが
 *   `opacity-0` で視覚的に invisible なので、keyboard / screen reader / motor
 *   disability ユーザは「focus indicator が見えない、押した時の動作が予想つかない」
 *   状態になる。WCAG 2.4.7 (Focus Visible) 違反方向。
 *
 * fix (1 ファイル ~1 行差分):
 *   - `group-hover:opacity-100` に `group-focus-within:opacity-100` を併記
 *   - keyboard で button へ Tab が移った時 = focus-within が trigger = card の
 *     decompose wrapper も同時に opacity-100 で見える
 *
 * 検証: source-side regex assert + iter515-657 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )

  // 1. group-focus-within:opacity-100 追加
  if (
    /opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100/.test(kv)
  ) {
    findings.push({ level: 'info', message: `decompose wrapper group-focus-within OK` })
  } else {
    findings.push({ level: 'warning', message: `decompose wrapper group-focus-within なし` })
  }

  // 2. group-hover:opacity-100 (既存) も維持
  if (/group-hover:opacity-100/.test(kv)) {
    findings.push({ level: 'info', message: `group-hover:opacity-100 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `group-hover:opacity-100 破壊` })
  }

  // 3. iter657 invariant: goals page の back-link arrow aria-hidden 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/goals/page.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">← <\/span>Workspace/.test(gp)) {
    findings.push({ level: 'info', message: `iter657 invariant: goals back-link 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter657 invariant: 破壊` })
  }

  // 4. iter656 invariant: decompose-proposals motion-safe 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter656 invariant: decompose pulse motion-safe 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter656 invariant: 破壊` })
  }

  // 5. iter655 invariant: subtasks-panel overDepth ⚠ 維持
  const sp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/subtasks-panel.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">⚠ <\/span>深さ \{MAX_TREE_DEPTH\}/.test(sp)) {
    findings.push({ level: 'info', message: `iter655 invariant: subtasks overDepth ⚠ 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter655 invariant: 破壊` })
  }

  console.log(`\n=== Findings (kanban-decompose-focus-iter658) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
