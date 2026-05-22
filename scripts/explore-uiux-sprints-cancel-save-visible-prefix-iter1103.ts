/**
 * Phase 6.15 loop iter1103: sprints-panel 2 set (Sprint 期間編集 + Sprint デフォルト編集) の
 * cancel/save button aria-label visible-prefix regression guard。
 *
 * iter1103 で発見した bug: 2 set × 3 path = 6 button の旧 aria-label は visible
 * "キャンセル" / "保存" / "保存中…" を末尾持ちで voice control prefix-matching「click 保存」 match 不可。
 * iter1093-1102 sweep convention に合わせ visible 冒頭固定。
 *
 * 修正 (sprints-panel.tsx) — 6 path:
 *   Sprint 期間編集:
 *     - cancel: "キャンセル — Sprint「name」の期間編集を破棄"
 *     - save default: "保存 — Sprint「name」の期間を保存"
 *     - save pending: "保存中… — Sprint「name」の期間を保存中"
 *   Sprint デフォルト編集:
 *     - cancel: "キャンセル — Sprint デフォルトの編集を破棄"
 *     - save default: "保存 — Sprint デフォルト (基本曜日 / 期間) を保存"
 *     - save pending: "保存中… — Sprint デフォルトを保存中"
 *
 * sprints-panel は実 supabase + auth + workspace 必要、Docker 不在で fallback。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-sprints-cancel-save-visible-prefix-iter1103.ts
 * 前提: なし
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface Finding {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

async function main() {
  const findings: Finding[] = []
  const here = dirname(fileURLToPath(import.meta.url))
  const filePath = resolve(here, '../src/components/workspace/sprints-panel.tsx')
  const src = readFileSync(filePath, 'utf8')

  const expected = [
    'キャンセル — Sprint「${sprint.name}」の期間編集を破棄',
    '保存 — Sprint「${sprint.name}」の期間を保存',
    '保存中… — Sprint「${sprint.name}」の期間を保存中',
    '"キャンセル — Sprint デフォルトの編集を破棄"',
    "'保存 — Sprint デフォルト (基本曜日 / 期間) を保存'",
    "'保存中… — Sprint デフォルトを保存中'",
  ]
  for (const e of expected) {
    if (!src.includes(e)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `sprints-panel に visible-prefix '${e}' が無い`,
      })
    }
  }
  // 旧 bare 形式が残ってないか
  const oldBares = [
    '`Sprint「${sprint.name}」の期間編集をキャンセル`',
    "'Sprint デフォルトの編集をキャンセル'",
    "'Sprint デフォルトを保存中…'",
    "'Sprint デフォルト (基本曜日 / 期間) を保存'",
  ]
  for (const s of oldBares) {
    if (src.includes(s)) {
      findings.push({
        level: 'error',
        source: 'a11y',
        message: `旧 bare aria-label '${s}' が残存`,
      })
    }
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — sprints-panel 6 button aria-label は visible-prefix 配置済')
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
