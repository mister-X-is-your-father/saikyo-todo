/**
 * Phase 6.15 loop iter 1001 — workspace dashboard nav 8 forward Link aria-label sweep。
 *
 * 課題: workspace 内ナビ <nav> (page.tsx 内) は iter995 で
 *   aria-label="ワークスペース内 (Goals / Sprints / PDCA / Templates / Workflows /
 *   API / Time / Archive)" を持つが、内側 8 個の <Link> 自体には aria-label 無し。
 *   visible text "Goals" / "Sprints" / "PDCA" / 等が極短のため、SR ユーザは
 *   各 Link がどんな page に行くか文脈を持たず focus 進行する。各 sub-page の
 *   <main> aria-label (iter977-985) と齐えれば、forward 時の SR 体験が landmark
 *   識別 → forward link 同 wording 連結で大幅に向上。
 *
 * fix: 8 forward Link それぞれに aria-label を追加 (各 sub-page の <main>
 *   aria-label と同 wording + " ページへ移動" 末尾)。visible text 不変、視覚 / DOM
 *   は <Link> 属性追加のみ。
 *
 *   - Goals → "Goals: OKR / Goals (Objective + Key Results) ページへ移動"
 *   - Sprints → "Sprints: Sprint 計画 → 稼働 → 完了 ページへ移動"
 *   - PDCA → "PDCA: Plan / Do / Check / Act + Lead time ページへ移動"
 *   - Templates → "Templates: ワークパッケージ定義 ページへ移動"
 *   - Workflows → "Workflows: 自動化ワークフロー (n8n 風) ページへ移動"
 *   - API 連携 → "API 連携: 外部 API (Yamory / カスタム REST) → Item 取込 ページへ移動"
 *   - Time Entries → "Time Entries: 稼働入力 やったこと + 時間を記録 ページへ移動"
 *   - Archive → "Archive: アーカイブ済 Item 一覧 ページへ移動"
 *
 *   +24 行 (1 file = workspaceId/page.tsx)。視覚 / 動作不変、SR は各 Link focus 時に
 *   destination 内容を具体的に把握。
 *
 * 機能追加なし、shadcn 編集なし、影響面 1 ファイル。
 *
 * 検証: source-side regex で codify (sub-page <main> aria-label と forward Link
 * aria-label の wording 一貫性 cross-check 込み)。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []
  const wsPage = readFileSync(
    resolve(process.cwd(), 'src/app/(workspace)/[workspaceId]/page.tsx'),
    'utf8',
  )

  // iter1498: iter1093-1497 em-dash sweep に合わせ ':' → ' — ' に migration
  // (iter1226 workspace-mode-selector と同 colon → em-dash 変換、iter1001 検証目的 =
  // visible-prefix + functional descriptive 存在 guard で区切 punctuation は不問)
  const expectations: Array<{ name: string; pattern: RegExp }> = [
    {
      name: 'Goals',
      pattern: /aria-label="Goals — OKR \/ Goals \(Objective \+ Key Results\) ページへ移動"/,
    },
    {
      name: 'Sprints',
      pattern: /aria-label="Sprints — Sprint 計画 → 稼働 → 完了 ページへ移動"/,
    },
    {
      name: 'PDCA',
      pattern: /aria-label="PDCA — Plan \/ Do \/ Check \/ Act \+ Lead time ページへ移動"/,
    },
    {
      name: 'Templates',
      pattern: /aria-label="Templates — ワークパッケージ定義 ページへ移動"/,
    },
    {
      name: 'Workflows',
      pattern: /aria-label="Workflows — 自動化ワークフロー \(n8n 風\) ページへ移動"/,
    },
    {
      name: 'API 連携',
      pattern:
        /aria-label="API 連携 — 外部 API \(Yamory \/ カスタム REST\) → Item 取込 ページへ移動"/,
    },
    {
      name: 'Time Entries',
      pattern: /aria-label="Time Entries — 稼働入力 やったこと \+ 時間を記録 ページへ移動"/,
    },
    {
      name: 'Archive',
      pattern: /aria-label="Archive — アーカイブ済 Item 一覧 ページへ移動"/,
    },
  ]
  for (const e of expectations) {
    if (e.pattern.test(wsPage)) {
      findings.push({ level: 'info', message: `${e.name} forward Link aria-label OK` })
    } else {
      findings.push({
        level: 'warning',
        message: `${e.name} forward Link aria-label 不在 (期待: ${e.pattern})`,
      })
    }
  }

  // cross-check: sub-page <main> aria-label と forward Link aria-label の wording 同期
  const subPages: Array<{ file: string; wsLink: string; mainContains: string }> = [
    {
      file: 'src/app/(workspace)/[workspaceId]/goals/page.tsx',
      wsLink: 'Goals',
      mainContains: 'OKR / Goals (Objective + Key Results)',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/sprints/page.tsx',
      wsLink: 'Sprints',
      mainContains: 'Sprint 計画 → 稼働 → 完了',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/pdca/page.tsx',
      wsLink: 'PDCA',
      mainContains: 'PDCA Plan / Do / Check / Act + Lead time',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/templates/page.tsx',
      wsLink: 'Templates',
      mainContains: 'Templates ワークパッケージ定義',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/workflows/page.tsx',
      wsLink: 'Workflows',
      mainContains: 'Workflows 自動化ワークフロー (n8n 風)',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/integrations/page.tsx',
      wsLink: 'API 連携',
      mainContains: 'API 連携 外部 API (Yamory / カスタム REST) → Item 取込',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/time-entries/page.tsx',
      wsLink: 'Time Entries',
      mainContains: '稼働入力 やったこと + 時間を記録',
    },
    {
      file: 'src/app/(workspace)/[workspaceId]/archive/page.tsx',
      wsLink: 'Archive',
      mainContains: 'アーカイブ済 Item 一覧',
    },
  ]
  for (const sp of subPages) {
    try {
      const src = readFileSync(resolve(process.cwd(), sp.file), 'utf8')
      if (src.includes(sp.mainContains)) {
        findings.push({
          level: 'info',
          message: `sub-page <main> aria-label wording 一致 (${sp.wsLink})`,
        })
      } else {
        findings.push({
          level: 'warning',
          message: `sub-page <main> aria-label wording drift (${sp.wsLink}): "${sp.mainContains}" 不在`,
        })
      }
    } catch {
      findings.push({ level: 'warning', message: `sub-page ${sp.file} read fail` })
    }
  }

  // invariant: <nav> aria-label (iter995) 不変
  if (
    !/aria-label="ワークスペース内 \(Goals \/ Sprints \/ PDCA \/ Templates \/ Workflows \/ API \/ Time \/ Archive\)"/.test(
      wsPage,
    )
  ) {
    findings.push({ level: 'warning', message: `iter995 <nav> aria-label 不在` })
  } else {
    findings.push({ level: 'info', message: `iter995 <nav> invariant OK` })
  }

  console.log(`\n=== Findings (workspace-dashboard-nav-link-aria-labels-iter1001) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)
  process.exit(findings.some((f) => f.level !== 'info') ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
