/**
 * Phase 6.15 loop iter863 — sprints-panel.tsx の 9 button visible text を aria-hidden
 * span で wrap した regression guard。
 *
 * 対象 (Sprint Card + 期間編集 form 内 button):
 *   1. 期間編集 キャンセル — "キャンセル"
 *   2. 期間編集 保存 — `{update.isPending ? '保存中…' : '保存'}`
 *   3. 期間 button — "期間" (CalendarRange icon + text)
 *   4. 稼働開始 — "稼働開始" (Play icon + text)
 *   5. 完了 — "完了" (CheckCircle icon + text)
 *   6. 計画に戻す — "計画に戻す" (Pause icon + text)
 *   7. 中止 — "中止" (X icon + text)
 *   8. 振り返り生成 — `{retroPending ? '振り返り生成中…' : '振り返り生成'}` (Sparkles + text)
 *   9. Pre-mortem (3 状態) — Sparkles + text
 *
 * 既存 wrap: 320 行 (作成 submit), 509 行 (status badge), 574/577 行 (期間進捗 chip),
 * 998 行 (デフォルト キャンセル), 1013 行 (デフォルト 保存)。
 *
 *   pnpm tsx scripts/explore-uiux-sprints-panel-aria-hidden-iter863.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

const FILE = 'src/components/workspace/sprints-panel.tsx'

function main(): void {
  const findings: Finding[] = []
  const src = readFileSync(resolve(process.cwd(), FILE), 'utf8')

  const requiredWraps = [
    /aria-label=\{`Sprint「\$\{sprint\.name\}」の期間編集をキャンセル`\}[\s\S]{0,80}<span aria-hidden="true">キャンセル<\/span>/,
    /<span aria-hidden="true">\{update\.isPending \? `Sprint「\$\{sprint\.name\}」の期間を保存中…` : `Sprint「\$\{sprint\.name\}」の期間を保存`\}/,
    /<span aria-hidden="true">期間<\/span>/,
    /<span aria-hidden="true">稼働開始<\/span>/,
    /<span aria-hidden="true">完了<\/span>/,
    /<span aria-hidden="true">計画に戻す<\/span>/,
    /<span aria-hidden="true">中止<\/span>/,
    /<span aria-hidden="true">\{retroPending \? '振り返り生成中…' : '振り返り生成'\}<\/span>/,
  ]
  // 2 は実は visible text が `{...}` なので、ここでは下の動的 text 用 を別 form で確認:
  if (!/<span aria-hidden="true">\{update\.isPending \? '保存中…' : '保存'\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '期間編集 保存 button visible wrap が無い' })
  }
  for (const r of requiredWraps) {
    if (!r.test(src)) {
      // 期間編集 保存 (idx 1) は上の別 form で扱ったので skip
      if (r.source.includes('期間を保存中')) continue
      findings.push({
        level: 'error',
        message: `wrap pattern not found: ${r.source.slice(0, 80)}...`,
      })
    }
  }
  // Pre-mortem は multi-line wrap で wrapped 検出は textual で
  if (!src.includes('<span aria-hidden="true">\n                  {premortemPending')) {
    if (!src.includes('<span aria-hidden="true">{premortemPending')) {
      findings.push({ level: 'error', message: 'Pre-mortem button visible wrap が無い' })
    }
  }

  // 既存 wrap 健在
  if (
    !/<span aria-hidden="true">\{createMut\.isPending \? '作成中…' : '作成'\}<\/span>/.test(src)
  ) {
    findings.push({ level: 'error', message: '既存 作成 button wrap が消えた' })
  }
  if (!/<span aria-hidden="true">\{sprintStatusLabelJa\(status\)\}<\/span>/.test(src)) {
    findings.push({ level: 'error', message: '既存 status badge wrap が消えた' })
  }

  // raw 単独行残置なし
  const rawRows = src
    .split('\n')
    .filter((line) =>
      /^\s*(キャンセル|保存|期間|稼働開始|完了|計画に戻す|中止|振り返り生成|Pre-mortem 生成|Pre-mortem 再生成|Pre-mortem 生成中…|振り返り生成中…)\s*$/.test(
        line,
      ),
    )
  if (rawRows.length > 0) {
    findings.push({
      level: 'error',
      message: `raw visible 単独行 ${rawRows.length} 件残存: ${rawRows.map((r) => r.trim()).join(', ')}`,
    })
  }

  console.log(`\n=== Findings (sprints-panel-aria-hidden iter863) ===`)
  if (findings.length === 0) console.log('(なし) 期待どおり全 invariant OK (static grep verify)')
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  process.exit(findings.some((f) => f.level === 'error') ? 1 : 0)
}

main()
