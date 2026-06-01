/**
 * Phase 6.15 loop iter1629: aria-label dynamic template の **内部 colon
 * descriptor pattern** (`ラベル: ${X}` の colon 区切) を iter1626-1628 sweep の
 * em-dash dynamic template convention に合わせ削除。
 *
 * 並行 fire の parallel agent が iter1626 (StatCard) / iter1627 / iter1628
 * (DashboardChip 5 caller) で実施した colon → em-dash sweep の補完。
 *
 * 修正対象 (2 箇所):
 *   1. status-badge.tsx: `${cfg.shortLabel} — ステータス: ${cfg.label}` →
 *      `${cfg.shortLabel} — ステータス ${cfg.label}` (内部 colon 削除)
 *   2. app/page.tsx: `${ws.name} を開く — slug: ${X} / role: ${Y}` →
 *      `${ws.name} を開く — slug ${X} / role ${Y}` (内部 colon 削除、
 *      descriptor-value 自然読み上げ)
 *
 * 効果:
 *   - SR で colon と em-dash の混在 separator 消失、1 形式 (em-dash 上層 + space 下層)
 *   - iter1626-1628 sweep mature の sibling として dynamic template に 全 file 統一
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-internal-colon-em-dash-iter1629.ts
 * 前提: なし (source 直読 invariant only、supabase / docker 起動不可 fire 対応)
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

  const statusSrc = readFileSync(
    resolve(here, '../src/components/workspace/status-badge.tsx'),
    'utf8',
  )
  const pageSrc = readFileSync(resolve(here, '../src/app/page.tsx'), 'utf8')

  // (1) status-badge: 新 convention (`ステータス ${cfg.label}`) が含まれ、旧 colon 形式が残らない
  if (!statusSrc.includes('`${cfg.shortLabel} — ステータス ${cfg.label}`')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `status-badge.tsx に em-dash convention \`\${cfg.shortLabel} — ステータス \${cfg.label}\` が無い`,
    })
  }
  if (statusSrc.includes('`${cfg.shortLabel} — ステータス: ${cfg.label}`')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `status-badge.tsx に旧 colon convention \`ステータス: \${cfg.label}\` が残存`,
    })
  }

  // (2) page.tsx: 新 convention (`slug ${X} / role ${Y}`) が含まれ、旧 colon 形式が残らない
  if (!pageSrc.includes('`${ws.name} を開く — slug ${ws.slug} / role ${ws.role}`')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `app/page.tsx に em-dash convention \`slug \${ws.slug} / role \${ws.role}\` が無い`,
    })
  }
  if (pageSrc.includes('slug: ${ws.slug}') || pageSrc.includes('role: ${ws.role}')) {
    findings.push({
      level: 'error',
      source: 'aria',
      message: `app/page.tsx に旧 colon convention \`slug: ... / role: ...\` が残存`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log(
      '(なし) — aria-label dynamic template 内部 colon descriptor を em-dash convention に統一済 (iter1629 着地)',
    )
  } else {
    for (const f of findings) console.log(`  [${f.level}/${f.source}] ${f.message}`)
  }
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.filter((f) => f.level === 'error').length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
