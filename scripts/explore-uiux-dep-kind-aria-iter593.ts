/**
 * Phase 6.15 loop iter 593 (mode-D Desktop a11y) —
 * item-dependencies-panel 依存の種類 <select> 動的 aria-label + 効果説明補強。
 *
 * 課題: item-dependencies-panel.tsx 行 183-192 の dep-kind <select> は
 *   aria-label が "依存の種類" の static で current value (prerequisite/related)
 *   が expose されない。さらに「前提条件」 と「関連」 の意味的差 (進行ブロック
 *   の有無) が visible/AT どちらでも初見で読み取り辛い。
 *
 * fix (1 ファイル ~9 行差分):
 *   - aria-label 動的化: `依存の種類 (現在: ${jpHintWithEffect})`
 *     - 'prerequisite' → '前提条件 (上流、これが完了しないと本 Item を着手できない)'
 *     - 'related'      → '関連 (緩い結び付き、進行ブロックではない)'
 *     - 未知 → raw fallback で破綻防止
 *
 * iter587/588/589/590/591/592 (動的 aria-label expose / i18n 整合) pattern を
 * dependencies-panel kind select に水平展開、効果 (ブロック / 非ブロック) を
 * SR で 1 phrase で確認可能。
 *
 * 検証: source-side regex assert + iter515-592 invariant cross-check。
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

  // 1. pickKind 'prerequisite' → '前提条件 (上流、...)'
  if (
    /pickKind === 'prerequisite'\s*\n?\s*\?\s*'前提条件 \(上流、これが完了しないと本 Item を着手できない\)'/.test(
      idp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `pickKind 'prerequisite' → '前提条件 (上流、効果説明)' OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `pickKind 'prerequisite' 変換なし` })
  }

  // 2. pickKind 'related' → '関連 (緩い結び付き、...)'
  if (
    /pickKind === 'related'\s*\n?\s*\?\s*'関連 \(緩い結び付き、進行ブロックではない\)'/.test(idp)
  ) {
    findings.push({
      level: 'info',
      message: `pickKind 'related' → '関連 (緩い結び付き、効果説明)' OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `pickKind 'related' 変換なし` })
  }

  // 3. aria-label 動的 template literal
  if (/aria-label=\{`依存の種類 \(現在: \$\{/.test(idp)) {
    findings.push({ level: 'info', message: `aria-label 動的 template literal OK` })
  } else {
    findings.push({ level: 'warning', message: `aria-label 動的化なし` })
  }

  // 4. iter592 invariant: goals-panel mode aria-label 維持
  const gp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/goals-panel.tsx'),
    'utf8',
  )
  if (/aria-label=\{`KR 進捗算出モード \(現在: \$\{/.test(gp)) {
    findings.push({ level: 'info', message: `iter592 invariant: goals mode 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter592 invariant: 破壊` })
  }

  // 5. iter591 invariant: gantt zoom aria-label 維持
  const gv = readFileSync(resolve(process.cwd(), 'src/components/workspace/gantt-view.tsx'), 'utf8')
  if (/aria-label=\{`Gantt の 1 日あたりの幅 \(現在: \$\{/.test(gv)) {
    findings.push({ level: 'info', message: `iter591 invariant: gantt zoom 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter591 invariant: 破壊` })
  }

  // 6. iter590 invariant: sprint filter aria-label 維持
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/sprintFilter === 'active'\s*\n?\s*\?\s*'稼働中の Sprint'/.test(ib)) {
    findings.push({ level: 'info', message: `iter590 invariant: sprint filter 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter590 invariant: 破壊` })
  }

  // 7. iter587 invariant: gantt show-deps aria-label 維持
  if (
    /aria-label=\{showDeps \? '依存線を表示中 \(クリックで非表示\)' : '依存線を表示する'\}/.test(gv)
  ) {
    findings.push({ level: 'info', message: `iter587 invariant: gantt show-deps 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter587 invariant: 破壊` })
  }

  console.log(`\n=== Findings (dep-kind-aria-iter593) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
