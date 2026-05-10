/**
 * Phase 6.15 loop iter 878 (mode-D Desktop a11y) —
 * workflows-panel wf-node-preset (6 button) + wf-run-rerun button: WCAG 2.5.3
 * (Label in Name) 違反を node-preset 6 button で修正 + visible aria-hidden 統合 (run-rerun も)。
 *
 * 課題: src/components/workflow/workflows-panel.tsx:
 *   - wf-node-preset (6 button: noop/http/ai/slack/email/script) visible "+ {type}" は
 *     "+" を含むため旧 aria-label "graph に {title} の skeleton node を追加" の substring
 *     不適合 → WCAG 2.5.3 違反 (6 button 横断)。
 *   - wf-run-rerun (visible "再") aria-label "...を再実行" 適合だったが iter844-877
 *     campaign 規約 (visible aria-hidden 単独経路) から外れていた。
 *
 * fix (1 ファイル / +8-6 行差分、7 button 一括):
 *   - wf-node-preset aria-label: `+ ${type} を追加 (graph に ${title} の skeleton node)`
 *     → visible "+ {type}" prefix 適合 (6 button 共通)
 *   - wf-node-preset visible "+ {type}" を <span aria-hidden="true"> で wrap
 *   - wf-run-rerun visible "再" を <span aria-hidden="true"> で wrap (aria-label 維持)
 *
 * 検証: source-side regex assert + iter875-877 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const wp = readFileSync(
    resolve(process.cwd(), 'src/components/workflow/workflows-panel.tsx'),
    'utf8',
  )

  // 1. wf-node-preset 新 aria-label に visible "+ {type}" prefix
  if (
    /aria-label=\{`\+ \$\{preset\.type\} を追加 \(graph に \$\{preset\.title\} の skeleton node\)`\}/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `wf-node-preset 新 aria-label に visible "+ {type}" prefix 含む OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-preset 新 aria-label に visible "+ {type}" prefix 不含`,
    })
  }

  // 2. wf-node-preset visible "+ {preset.type}" span aria-hidden
  if (/<span aria-hidden="true">\+ \{preset\.type\}<\/span>/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-node-preset visible "+ {type}" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-preset visible "+ {type}" aria-hidden 未統合`,
    })
  }

  // 3. 旧 wf-node-preset aria-label "graph に ... を追加" (visible 不含 form) 削除
  if (!/aria-label=\{`graph に \$\{preset\.title\} の skeleton node を追加`\}/.test(wp)) {
    findings.push({
      level: 'info',
      message: `wf-node-preset 旧 aria-label "graph に..." 削除済 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-node-preset 旧 aria-label "graph に..." 残存`,
    })
  }

  // 4. wf-run-rerun visible "再" span aria-hidden
  if (
    /data-testid=\{`wf-run-rerun-\$\{r\.id\}`\}[\s\S]+?<span aria-hidden="true">再<\/span>/.test(wp)
  ) {
    findings.push({
      level: 'info',
      message: `wf-run-rerun visible "再" span aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `wf-run-rerun visible "再" aria-hidden 未統合`,
    })
  }

  // iter877 invariant: comment-post visible '投稿中…/投稿' aria-hidden
  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  if (/<span aria-hidden="true">\{create\.isPending \? '投稿中…' : '投稿'\}<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `iter877 invariant: comment-post 投稿 vocab + aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter877 invariant: comment-post 破壊` })
  }

  // iter876 invariant: redecompose
  const dp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/decompose-proposals-panel.tsx'),
    'utf8',
  )
  if (/`再分解 \(AI 分解を再実行\)`/.test(dp)) {
    findings.push({
      level: 'info',
      message: `iter876 invariant: redecompose aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter876 invariant: redecompose 破壊` })
  }

  // iter870 invariant: wf-toggle aria-label
  if (
    /`Workflow「\$\{wf\.name\}」を\$\{wf\.enabled \? '無効化 \(実行 button \+ cron 自動 trigger を停止\)' : '有効化 \(実行 button \+ cron 自動 trigger を再開\)'\}`/.test(
      wp,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter870 invariant: wf-toggle aria-label 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter870 invariant: wf-toggle 破壊` })
  }

  console.log(`\n=== Findings (workflows-node-rerun-iter878) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
