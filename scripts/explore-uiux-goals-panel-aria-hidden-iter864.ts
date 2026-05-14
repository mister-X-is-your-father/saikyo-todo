/**
 * Phase 6.15 loop iter864 — goals-panel.tsx の 6 button visible text を aria-hidden
 * span で wrap した regression guard。
 *
 * 対象 (Goal Card status 遷移 + KR 追加 form):
 *   1. 完了 button (active state) — "完了"
 *   2. アーカイブ (active state) — "アーカイブ"
 *   3. active に戻す (completed state) — "active に戻す"
 *   4. アーカイブ (completed state) — "アーカイブ" (1 と replace_all で同時 wrap)
 *   5. active に戻す (archived state) — "active に戻す"
 *   6. KR 追加 button — "KR 追加" (Plus icon + text)
 *
 * 既存 wrap: 259 行 (作成 submit), 460 行 (status badge), 594 行 (AI 分解), 723 行 (KR 削除 ✕)。
 *
 *   pnpm tsx scripts/explore-uiux-goals-panel-aria-hidden-iter864.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/goals-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  if (!/<span aria-hidden="true">完了<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '完了 button wrap が無い' })
  }
  const archiveCount = (src.match(/<span aria-hidden="true">アーカイブ<\/span>/g) ?? []).length
  if (archiveCount < 2) {
    findings.push({
      level: 'error',
      message: `アーカイブ button wrap が ${archiveCount} 件 < 2 件 (active + completed 2 段)`,
    })
  }
  const activeNiModosuCount = (src.match(/<span aria-hidden="true">active に戻す<\/span>/g) ?? [])
    .length
  if (activeNiModosuCount < 2) {
    findings.push({
      level: 'error',
      message: `active に戻す button wrap が ${activeNiModosuCount} 件 < 2 件 (completed + archived 2 段)`,
    })
  }
  if (!/<span aria-hidden="true">KR 追加<\/span>/.test(src)) {
    findings.push({ level: 'error', message: 'KR 追加 button wrap が無い' })
  }

  // 既存 wrap regression
  if (
    !/<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(src)
  ) {
    findings.push({ level: 'error', message: '既存 作成 button wrap が消えた' })
  }
  if (
    !/<span aria-hidden="true">\{decompose\.isPending \? 'AI 分解中…' : 'AI 分解'\}<\/span>/.test(
      src,
    )
  ) {
    findings.push({ level: 'error', message: '既存 AI 分解 button wrap が消えた' })
  }

  // raw 単独行残置なし
  const rawRows = src
    .split('\n')
    .filter((line) => /^\s*(完了|アーカイブ|active に戻す|KR 追加)\s*$/.test(line))
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible 単独行 ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  console.log(`\n=== Findings (goals-panel-aria-hidden iter864) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
