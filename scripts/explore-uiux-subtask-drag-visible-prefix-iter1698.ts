/**
 * Phase 6.15 loop iter 1698 — subtasks-panel の drag handle aria-label を
 * visible-prefix 化 (iter1697 backlog sortable <th> と同 pattern を sweep)。
 *
 * 課題: src/components/workspace/subtasks-panel.tsx 164 行 drag handle button の
 *   aria-label `「${item.title}」 — ドラッグで並び替え` は accessible name 先頭が
 *   「 (U+300C) で始まる。voice control「click ${item.title}」 strict prefix match
 *   と不一致 (WCAG 2.5.3 「Label in Name」)。drag handle は <button> + dnd-kit
 *   listeners で interactive (focus + click 可) なので voice control の対象。
 *
 * fix: 「${item.title}」 → ${item.title} (1 line + comment 5-6 line)。
 *   - drag handle button (line 164): 「」 quote を外し ${item.title} を literal prefix に
 *   - 行内非 interactive な subtasks-panel:299 (<ol>) / start-timer-button (role=img) /
 *     engineer-trigger-button (role=group) / sprint-risk-board-widget (role=list) は
 *     interactive でないため voice control 対象外、本 iter scope 外
 *
 * 検証: source-side regex assert で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  // 1. subtasks-panel.tsx: drag handle aria-label に literal `${item.title}` prefix
  const target = 'src/components/workspace/subtasks-panel.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1a. 旧 「${item.title}」 — ドラッグで並び替え が残っていないこと
  if (/aria-label=\{`「\$\{item\.title\}」 — ドラッグで並び替え`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 旧 aria-label \`「\${item.title}」 — ドラッグで並び替え\` が残存`,
    })
  } else {
    findings.push({ level: 'info', message: 'drag handle 旧 quote-prefix 除去 OK' })
  }

  // 1b. 新 ${item.title} — ドラッグで並び替え が存在すること
  if (!/aria-label=\{`\$\{item\.title\} — ドラッグで並び替え`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: 新 aria-label \`\${item.title} — ドラッグで並び替え\` が無い`,
    })
  } else {
    findings.push({ level: 'info', message: 'drag handle 新 visible-prefix aria-label OK' })
  }

  // 2. iter1697 / iter386 / iter384 / iter385 invariant 維持 (regression guard)
  // backlog-view.tsx の iter1697 sortable header fix が壊れていないこと
  const backlog = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )
  if (!/列でソート \(現在: /.test(backlog)) {
    findings.push({
      level: 'warning',
      message: 'backlog-view.tsx: iter1697 sortable header aria-label pattern が消えた',
    })
  }

  // subtasks-panel.tsx の他 invariant: <ol> child list aria-label / step chip aria-label
  if (
    !/aria-label=\{`「\$\{item\.title\}」の子タスク \$\{grandchildren\.length\} 件`\}/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: <ol> child list aria-label が消えた (interactive ではないので fix scope 外、invariant 維持)`,
    })
  }
  if (!/aria-label=\{`\$\{index \+ 1\} 番目 — 深さ \$\{depth \+ 1\}`\}/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: step chip aria-label invariant が壊れた`,
    })
  }

  console.log(`\n=== Findings (subtask-drag-visible-prefix-iter1698) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
