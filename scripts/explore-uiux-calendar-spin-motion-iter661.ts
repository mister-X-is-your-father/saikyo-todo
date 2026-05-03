/**
 * Phase 6.15 loop iter 661 (mode-D Desktop a11y) —
 * calendar-view の 3 つの Loader2 spinner (header 保存中 / planned lane loading / actual lane loading)
 * を prefers-reduced-motion 尊重化 (motion-safe:animate-spin)。
 *
 * 課題: calendar-view.tsx 行 202, 239, 276 の 3 つの Loader2 icon は `animate-spin` で回転。
 *   `prefers-reduced-motion: reduce` を設定したユーザにも強制回転。
 *   - header 行 202: aria-label="保存中" + role="status" で SR は補完される、視覚 only spinner
 *   - planned/actual lane 行 239/276: aria-hidden で SR 不可視、role="status" + 文字 text "読み込み中..." で代替
 *
 * fix (1 ファイル ~3 行差分、3 spinner):
 *   - 全 `animate-spin` → `motion-safe:animate-spin`
 *   - reduced-motion: reduce 時は静止 icon、aria-label / 文字 text で状態伝達
 *
 * iter659 / iter660 と同 pattern を calendar-view 3 spinner に展開。
 * これで repo 内の全 animate-spin (3 file 5 spinner) が motion-safe 化完了。
 *
 * 検証: source-side regex assert + iter515-660 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const cv = readFileSync(
    resolve(process.cwd(), 'src/components/schedule/calendar-view.tsx'),
    'utf8',
  )

  // 1. header 保存中 spinner motion-safe
  if (/className="ml-2 inline h-3 w-3 motion-safe:animate-spin"/.test(cv)) {
    findings.push({ level: 'info', message: `header 保存中 motion-safe OK` })
  } else {
    findings.push({ level: 'warning', message: `header 保存中 motion-safe なし` })
  }

  // 2. lane loading spinner motion-safe (両方 lane で同一 className なので 1 件で代表)
  const laneCount = (cv.match(/className="mr-2 h-4 w-4 motion-safe:animate-spin"/g) ?? []).length
  if (laneCount === 2) {
    findings.push({ level: 'info', message: `2 lane Loader2 motion-safe OK (planned + actual)` })
  } else {
    findings.push({
      level: 'warning',
      message: `2 lane Loader2 motion-safe 数 != 2 (got ${laneCount})`,
    })
  }

  // 3. 旧の生 animate-spin が残ってない
  if (
    /className="ml-2 inline h-3 w-3 animate-spin"/.test(cv) ||
    /className="mr-2 h-4 w-4 animate-spin"/.test(cv)
  ) {
    findings.push({ level: 'warning', message: `生 animate-spin 残存` })
  } else {
    findings.push({ level: 'info', message: `生 animate-spin 残存なし OK` })
  }

  // 4. iter660 invariant: data-widget-card 維持
  const dwc = readFileSync(
    resolve(process.cwd(), 'src/components/shared/data-widget-card.tsx'),
    'utf8',
  )
  if (/Loader2 className="h-4 w-4 motion-safe:animate-spin"/.test(dwc)) {
    findings.push({ level: 'info', message: `iter660 invariant: data-widget 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter660 invariant: 破壊` })
  }

  // 5. iter659 invariant: async-states 維持
  const as = readFileSync(resolve(process.cwd(), 'src/components/shared/async-states.tsx'), 'utf8')
  if (/Loader2 className="h-5 w-5 motion-safe:animate-spin"/.test(as)) {
    findings.push({ level: 'info', message: `iter659 invariant: async-states 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter659 invariant: 破壊` })
  }

  // 6. iter656 invariant: decompose pulse 維持
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/isAgentRunning \? 'motion-safe:animate-pulse' : ''/.test(dp)) {
    findings.push({ level: 'info', message: `iter656 invariant: decompose pulse 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter656 invariant: 破壊` })
  }

  console.log(`\n=== Findings (calendar-spin-motion-iter661) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
