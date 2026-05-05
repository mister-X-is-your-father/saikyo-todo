/**
 * Phase 6.15 loop iter 834 (mode-D Desktop a11y) —
 * heartbeat-button + start-timer-button の Submit visible text を aria-hidden span に wrap (一括)。
 *
 * 課題: 2 button の visible text は parent Button に aria-label が完全 content を含むのに
 *   aria-hidden 無し。iter800-833 sweep の続編。
 *
 * fix (2 ファイル ~2 行差分):
 *   - heartbeat-button: 'Heartbeat' / 'スキャン中…' を aria-hidden で wrap
 *   - start-timer-button: visibleLabel を aria-hidden で wrap
 *
 * 検証: source-side regex assert + iter735-833 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )
  const stb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  const hasHeartbeat =
    /<span aria-hidden="true">\{scan\.isPending \? 'スキャン中…' : 'Heartbeat'\}<\/span>/.test(hb)
  const hasStartTimer = /<span aria-hidden="true">\{visibleLabel\}<\/span>/.test(stb)
  if (hasHeartbeat && hasStartTimer) {
    findings.push({
      level: 'info',
      message: `heartbeat + start-timer button visible aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `heartbeat / start-timer button aria-hidden 不完全 (heartbeat=${hasHeartbeat} startTimer=${hasStartTimer})`,
    })
  }

  // iter833 invariant: Item action 3 button visible aria-hidden
  const idb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-decompose-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{decompose\.isPending \? '分解中…' : 'AI 分解'\}<\/span>/.test(idb)
  ) {
    findings.push({
      level: 'info',
      message: `iter833 invariant: item-decompose-button visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter833 invariant: 破壊` })
  }

  // iter831 invariant: engineer-trigger visible aria-hidden merge
  const etb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/engineer-trigger-button.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">🛠 Engineer に実装させる<\/span>/.test(etb) &&
    /<span aria-hidden="true">起動中…<\/span>/.test(etb)
  ) {
    findings.push({
      level: 'info',
      message: `iter831 invariant: engineer-trigger visible aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter831 invariant: 破壊` })
  }

  // iter826 invariant: backlog updatedAt time semantic
  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (/<time dateTime=\{iso\} aria-label=\{`最終更新 \$\{display\}`\}>/.test(bv)) {
    findings.push({
      level: 'info',
      message: `iter826 invariant: backlog updatedAt time semantic 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter826 invariant: 破壊` })
  }

  // iter735 invariant: team-context-editor
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (heartbeat-start-timer-aria-hidden-iter834) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
