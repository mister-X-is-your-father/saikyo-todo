/**
 * Phase 6.15 loop iter 877 (mode-D Desktop a11y) —
 * today-view empty CTA + today-title button visible を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/today-view.tsx 2 button:
 *   - 行 149-162: today-empty-quick-add CTA visible "クイック追加にフォーカス (キー: q)"
 *   - 行 213-222: today-title button visible {it.title}
 *
 *   いずれも aria-label が完全 content を含むのに visible が aria-hidden 無し →
 *   SR 2 経路読み上げ重複。Today view は workspace 起動直後の主要画面で SR UX
 *   影響大。iter856 / iter871 / iter876 と同 vocabulary。iter844-876 と同 pattern。
 *
 * fix (1 ファイル +2/-2 行):
 *   - empty CTA: <span aria-hidden="true">クイック追加にフォーカス (キー: q)</span>
 *   - title: <span aria-hidden="true">{it.title}</span>
 *
 * 検証: source-side regex assert + iter871 / iter876 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const tv = readFileSync(resolve(process.cwd(), 'src/components/workspace/today-view.tsx'), 'utf8')

  if (
    /data-testid="today-empty-quick-add"[\s\S]*?<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter877-a: today-empty-quick-add CTA aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter877-a: today-empty-quick-add CTA aria-hidden 不完全`,
    })
  }

  if (
    /data-testid=\{`today-title-\$\{it\.id\}`\}[\s\S]*?<span aria-hidden="true">\{it\.title\}<\/span>/.test(
      tv,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter877-b: today-title button aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter877-b: today-title button aria-hidden 不完全`,
    })
  }

  // invariant: aria-label / data-testid 維持
  if (
    /aria-label="クイック追加入力欄にフォーカス \(q キーでも可\)"/.test(tv) &&
    /aria-label=\{`「\$\{it\.title\}」を編集`\}/.test(tv)
  ) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: aria-label / data-testid 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: 破壊` })
  }

  // iter871 invariant
  const ib = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/items-board.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(ib)) {
    findings.push({
      level: 'info',
      message: `iter871 invariant: items-board empty quick-add 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter871 invariant: 破壊` })
  }

  // iter876 invariant
  const kv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/kanban-view.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{item\.title\}<\/span>/.test(kv)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: kanban-title 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: 破壊` })
  }

  console.log(`\n=== Findings (today-empty-title-aria-hidden-iter877) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
