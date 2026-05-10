/**
 * Phase 6.15 loop iter 886 (mode-D Desktop a11y) —
 * item-dependencies-panel dep-add-btn + dep-remove button: visible text を span
 * aria-hidden で wrap (一括 campaign 拡張)。
 *
 * 課題: src/components/workspace/item-dependencies-panel.tsx:
 *   - dep-add-btn (visible "追加中…/追加") aria-label "依存を追加中…" / "選択した Item を依存先として追加" → 適合
 *   - dep-remove (visible "解除") aria-label "依存「{title}」を解除中…" / "...を解除" → 適合
 *   いずれも aria-label substring 適合だったが iter844-885 campaign 規約 (visible
 *   aria-hidden 単独経路) から外れていた。
 *
 * fix (1 ファイル / +2-2 行差分、2 button 一括):
 *   - dep-add-btn: <Button>{追加中…/追加}</Button> → <Button><span aria-hidden="true">{...}</span></Button>
 *   - dep-remove: <Button>解除</Button> → <Button><span aria-hidden="true">解除</span></Button>
 *
 * 検証: source-side regex assert + iter884/885 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-dependencies-panel.tsx'),
    'utf8',
  )

  // 1. dep-add-btn visible 追加中…/追加 span aria-hidden
  if (
    /data-testid="dep-add-btn"[\s\S]+?<span aria-hidden="true">\{add\.isPending \? '追加中…' : '追加'\}<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dep-add-btn visible 追加中…/追加 span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dep-add-btn visible aria-hidden 未統合`,
    })
  }

  // 2. dep-remove visible 解除 span aria-hidden
  if (
    /data-testid=\{`dep-remove-\$\{ref\.id\}`\}[\s\S]+?<span aria-hidden="true">解除<\/span>/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dep-remove visible "解除" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `dep-remove visible "解除" aria-hidden 未統合`,
    })
  }

  // 3. aria-label 維持
  if (
    /aria-label=\{\s*removing \? `依存「\$\{ref\.title\}」を解除中…` : `依存「\$\{ref\.title\}」を解除`\s*\}/.test(
      dp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `dep-remove aria-label 両状態維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `dep-remove aria-label 破壊` })
  }

  // iter885 invariant: start-timer aria-label
  const st = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/start-timer-button.tsx'),
    'utf8',
  )
  if (/`計測開始 \(「\$\{item\.title\}」のタイマー開始\)`/.test(st)) {
    findings.push({
      level: 'info',
      message: `iter885 invariant: start-timer normal aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter885 invariant: start-timer 破壊` })
  }

  // iter884 invariant: heartbeat
  const hb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/heartbeat-button.tsx'),
    'utf8',
  )
  if (/'スキャン中… \(Heartbeat MUST item の期限スキャン実行中\)'/.test(hb)) {
    findings.push({
      level: 'info',
      message: `iter884 invariant: heartbeat pending aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter884 invariant: heartbeat 破壊` })
  }

  console.log(`\n=== Findings (item-dependencies-aria-hidden-iter886) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
