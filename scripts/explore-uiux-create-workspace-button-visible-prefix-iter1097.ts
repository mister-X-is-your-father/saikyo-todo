/**
 * Phase 6.15 loop iter1097: create-workspace-form submit button aria-label visible-prefix regression
 * guard。
 *
 * iter1097 で発見した bug: 旧 aria-label "Workspace を新規作成" は visible "作成" を "新規**作成**"
 * 末尾位置に持ち、voice control prefix-matching で「click 作成」 match 不可。pending state も同様
 * (visible "作成中…" が "Workspace を**作成中…**" 末尾)。iter1093-1096 sweep convention に合わせ
 * visible 冒頭固定。
 *
 * 修正 (create-workspace-form.tsx): aria-label を "作成 — Workspace を新規作成" / pending
 * "作成中… — Workspace を作成中" に変更で visible 冒頭固定。
 *
 * 本 script は create-workspace を実 supabase + auth 経由で render 必要なので Docker 不在 mode
 * で browser 不能、source-of-truth 直読 invariant に fallback (iter1082 と同 pattern)。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-create-workspace-button-visible-prefix-iter1097.ts
 * 前提: なし (filesystem 読み込みのみ)
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
  const formPath = resolve(here, '../src/components/workspace/create-workspace-form.tsx')
  const src = readFileSync(formPath, 'utf8')

  // visible-prefix 形式が source に含まれるか (= aria-label が visible で始まる)
  if (!src.includes("'作成 — Workspace を新規作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `create-workspace-form の default aria-label が '作成 — Workspace を新規作成' (visible-prefix) でない`,
    })
  }
  if (!src.includes("'作成中… — Workspace を作成中'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `create-workspace-form の pending aria-label が '作成中… — Workspace を作成中' (visible-prefix) でない`,
    })
  }
  // 旧 visible-suffix が残存してないか
  if (src.includes("'Workspace を新規作成'") && !src.includes("'作成 — Workspace を新規作成'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `旧 visible-suffix 'Workspace を新規作成' が aria-label として残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — create-workspace-form button aria-label は visible-prefix 配置済')
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
