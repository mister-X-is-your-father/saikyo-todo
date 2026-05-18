/**
 * Phase 6.15 loop iter 958 (mode-M Mobile) — notification-preferences Label に
 * `min-h-11` を追加 (mobile tap target 44x44 適合)。iter943/946/953/955/956/957 同 pattern
 * を notification-preferences の 4 種 toggle にも展開、checkbox label tap-target sweep
 * 7 件目。
 *
 * 課題: notification-preferences の 4 種通知 toggle Label `flex cursor-pointer items-start
 *   gap-3 text-xs leading-snug` は icon + label + description で multi-line だが
 *   text-xs (12px) で全体 height 36-40px 程度、mobile 親指タップで 44x44 を割る境界。
 *   min-h-11 で 44px 保証することで confidence 向上。
 *
 * fix: notification-preferences.tsx の Label に min-h-11 を class 追加
 *   (`flex cursor-pointer items-start gap-3 text-xs leading-snug` → 同 + min-h-11)。
 *   +1/-1 行 (1 file)。視覚 styling / aria-label / data-testid 不変。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル 1 行。
 *
 * 検証: source-side regex で codify。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const target = 'src/components/workspace/notification-preferences.tsx'
  const src = readFileSync(resolve(process.cwd(), target), 'utf8')

  // 1. Label に min-h-11
  if (
    !/className="flex min-h-11 cursor-pointer items-start gap-3 text-xs leading-snug"/.test(src)
  ) {
    findings.push({
      level: 'warning',
      message: `${target}: notification toggle Label に min-h-11 不在`,
    })
  } else {
    findings.push({ level: 'info', message: `notification toggle Label min-h-11 OK` })
  }

  // 2. data-testid="pref-toggle-..." 維持
  if (!/data-testid={`pref-toggle-/.test(src)) {
    findings.push({
      level: 'warning',
      message: `${target}: data-testid pref-toggle-* 消滅 (regression)`,
    })
  } else {
    findings.push({ level: 'info', message: `data-testid pref-toggle-* 維持 OK` })
  }

  // 3. iter957 invariant: template-items MUST label
  const templateSrc = readFileSync(
    resolve(process.cwd(), 'src/components/template/template-items-editor.tsx'),
    'utf8',
  )
  if (!/<label className="flex min-h-11 items-center gap-1 text-sm">/.test(templateSrc)) {
    findings.push({ level: 'warning', message: `iter957 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter957 invariant OK` })
  }

  // 4. iter956 invariant: item-edit-dialog MUST label
  const itemEditSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/item-edit-dialog.tsx'),
    'utf8',
  )
  if (
    !/<label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">[\s\S]{0,400}edit-item-must/.test(
      itemEditSrc,
    )
  ) {
    findings.push({ level: 'warning', message: `iter956 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter956 invariant OK` })
  }

  // 5. iter955 invariant: decompose-proposals
  const decomposeSrc = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (!/<label className="flex min-h-11 items-center gap-1\.5 text-xs">/.test(decomposeSrc)) {
    findings.push({ level: 'warning', message: `iter955 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter955 invariant OK` })
  }

  // 6. iter954 invariant
  const authLayoutSrc = readFileSync(resolve(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
  if (!/aria-label="認証 \(ログイン \/ サインアップ\)"/.test(authLayoutSrc)) {
    findings.push({ level: 'warning', message: `iter954 invariant 破壊` })
  } else {
    findings.push({ level: 'info', message: `iter954 invariant OK` })
  }

  // 7. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({ level: 'info', message: `iter735 invariant OK (${tceMatches.length} 箇所)` })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant 破壊` })
  }

  console.log(`\n=== Findings (notification-preferences-tap-target-iter958) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
