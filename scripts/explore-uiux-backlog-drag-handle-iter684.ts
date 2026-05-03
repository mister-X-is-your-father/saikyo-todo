/**
 * Phase 6.15 loop iter 684 (mode-D Desktop a11y) —
 * backlog-view DragHandle (≡ character) を role="img" + 内部 aria-hidden で
 * SR 重複読み上げ防止 (iter178 / iter663 と同 wrap pattern)。
 *
 * 課題: backlog-view.tsx 行 438-444 の DragHandle `<span>` は aria-label="ドラッグで並び替え"
 *   を持つが、内部 visible char `≡` (HORIZONTAL TRIPLE Unicode U+2261) も SR が
 *   読み上げる可能性 (一部 SR は aria-label を name として使い、inner text content も
 *   別announce する)。
 *
 * fix (1 ファイル ~5 行差分):
 *   - 親 `<span>` に role="img" を追加 (= atomic group、内部要素を SR から hide)
 *   - 内部 `≡` を `<span aria-hidden="true">` で wrap (二重防衛、role=img + aria-hidden)
 *
 * iter178 / iter452 (must-badge / status-badge) と同 role="img" + aria-label pattern。
 *
 * 検証: source-side regex assert + iter515-683 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const bv = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/backlog-view.tsx'),
    'utf8',
  )

  // 1. DragHandle に role="img"
  if (
    /<span\s*\n\s*className="text-muted-foreground cursor-grab select-none active:cursor-grabbing"\s*\n\s*role="img"\s*\n\s*aria-label="ドラッグで並び替え"/.test(
      bv,
    )
  ) {
    findings.push({ level: 'info', message: `DragHandle role=img + aria-label OK` })
  } else {
    findings.push({ level: 'warning', message: `DragHandle role=img + aria-label なし` })
  }

  // 2. 内部 ≡ が aria-hidden でラップされている
  if (/<span aria-hidden="true">≡<\/span>/.test(bv)) {
    findings.push({ level: 'info', message: `≡ aria-hidden wrap OK` })
  } else {
    findings.push({ level: 'warning', message: `≡ aria-hidden wrap なし` })
  }

  // 3. iter683 invariant: assignee-picker PopoverContent label 維持
  const ap = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/assignee-picker.tsx'),
    'utf8',
  )
  if (/aria-label="アサイン \(メンバー \/ AI Agent\) を選択"/.test(ap)) {
    findings.push({ level: 'info', message: `iter683 invariant: assignee-picker label 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter683 invariant: 破壊` })
  }

  // 4. iter682 invariant: notification-bell labelledby 維持
  const nb = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/notification-bell.tsx'),
    'utf8',
  )
  if (/aria-labelledby="notification-bell-heading"/.test(nb)) {
    findings.push({ level: 'info', message: `iter682 invariant: notification-bell 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter682 invariant: 破壊` })
  }

  // 5. iter663 invariant: backlog sort indicator aria-hidden 維持
  if (/<span aria-hidden="true">\s*\n\s*\{\{ asc: ' ▲', desc: ' ▼' \}/.test(bv)) {
    findings.push({ level: 'info', message: `iter663 invariant: backlog sort 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter663 invariant: 破壊` })
  }

  // 6. iter681 invariant: backlog-title focus-visible 維持
  if (
    /'hover:text-primary focus-visible:ring-ring rounded text-left hover:underline focus-visible:ring-2 focus-visible:outline-none /.test(
      bv,
    )
  ) {
    findings.push({ level: 'info', message: `iter681 invariant: backlog-title 維持 OK` })
  } else {
    findings.push({ level: 'warning', message: `iter681 invariant: 破壊` })
  }

  console.log(`\n=== Findings (backlog-drag-handle-iter684) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
