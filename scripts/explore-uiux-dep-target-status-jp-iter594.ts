/**
 * Phase 6.15 loop iter 594 (mode-D Desktop a11y) —
 * item-dependencies-panel dep-target <option> の status raw key (todo/in_progress/done)
 * を JP shortLabel に変換 (visible + aria-label 両方統一、WCAG 3.1.2 整合)。
 *
 * 課題: item-dependencies-panel.tsx 行 209-217 の dep-target <option> map は
 *   visible text に `[${c.status}]` (raw English: todo/in_progress/done) を
 *   出し、aria-label も `(${c.status})` で同じく raw English を入れていた。
 *   workspace 内 status は基本日本語 ("TODO" / "進行中" / "完了") なのに、
 *   この select だけ英語 raw key で表示され不整合。SR ユーザは "in_progress"
 *   と聞かされる。
 *
 * fix (1 ファイル ~10 行差分):
 *   - getStatusVisual(c.status).shortLabel で 1 度だけ JP 変換
 *   - visible `[${statusJa}]` + aria-label `(${statusJa})` 両方使う
 *   - import { getStatusVisual } from '@/features/item/status-visual' 追加
 *
 * 既存 status-visual.ts (`getStatusVisual`) を再利用、新 helper / hard-code map なし。
 * iter589 status filter / iter593 dep-kind と同じ i18n 整合 axis を dep-target に展開。
 *
 * 検証: source-side regex assert + iter515-593 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const idp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // 1. import getStatusVisual
  if (/import \{ getStatusVisual \} from '@\/features\/item\/status-visual'/.test(idp)) {
    findings.push({ level: 'info', message: `getStatusVisual import OK` })
  } else {
    findings.push({ level: 'warning', message: `getStatusVisual import なし` })
  }

  // 2. statusJa = getStatusVisual(...).shortLabel で 1 度だけ JP 変換
  if (/const statusJa = getStatusVisual\(c\.status\)\.shortLabel/.test(idp)) {
    findings.push({ level: 'info', message: `statusJa pure 取得 OK` })
  } else {
    findings.push({ level: 'warning', message: `statusJa 抽出なし` })
  }

  // 3. visible text に statusJa を使う `[${statusJa}]`
  if (/\{c\.title\} \[\{statusJa\}\]/.test(idp)) {
    findings.push({ level: 'info', message: `visible text JP 統一 OK` })
  } else {
    findings.push({ level: 'warning', message: `visible text raw key 残存` })
  }

  // 4. aria-label にも statusJa を使う `(${statusJa})`
  if (/aria-label=\{[\s\S]*?MUST: \$\{c\.title\} \(\$\{statusJa\}\)/.test(idp)) {
    findings.push({ level: 'info', message: `aria-label JP 統一 OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label raw key 残存` })
  }

  // 5. iter593 invariant: dep-kind aria-label 維持
  if (/aria-label=\{`依存の種類 \(現在: \$\{/.test(idp)) {
    findings.push({ level: 'info', message: `iter593 invariant: dep-kind 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter593 invariant: 破壊` })
  }

  // 6. iter592 invariant: goals-panel mode aria-label 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`KR 進捗算出モード \(現在: \$\{/.test(gp)) {
    findings.push({ level: 'info', message: `iter592 invariant: goals mode 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter592 invariant: 破壊` })
  }

  // 7. iter589 invariant: status filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/statusFilter === 'todo'\s*\n?\s*\?\s*'TODO'/.test(ib)) {
    findings.push({ level: 'info', message: `iter589 invariant: status filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter589 invariant: 破壊` })
  }

  console.log(`\n=== Findings (dep-target-status-jp-iter594) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
