/**
 * Phase 6.15 loop iter 875 (mode-D Desktop a11y) —
 * comment-thread 5 button + create-time-entry-form submit visible を aria-hidden span で wrap (6 callsite).
 *
 * 課題: 2 file:
 *   - comment-thread.tsx (5 button): 投稿 / 編集 / 削除 / 編集 cancel / 編集保存 visible
 *   - create-time-entry-form.tsx submit: visible "..." / "記録"
 * 各々 aria-label が完全 content (comment body 30 char + action / 稼働記録 + action) を含むのに、
 * 内側 visible は aria-hidden 無し → SR ユーザに重複読み上げ。
 * iter844-874 sweep の続編で 6 callsite 一括対応、Comment + Time entry の SR 経路整合性向上。
 *
 * fix (+6/-5、6 callsite、2 file):
 *   - comment 投稿 visible 動的 (送信中… / 投稿) → span aria-hidden
 *   - comment 編集 cancel visible "キャンセル" → span aria-hidden
 *   - comment 編集保存 visible "保存" → span aria-hidden
 *   - comment 行内 編集 / 削除 visible → span aria-hidden 各々
 *   - time-entry submit visible 動的 (... / 記録) → span aria-hidden
 *
 * 検証: source-side regex assert + iter735-874 invariant cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const ct = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/comment-thread.tsx'),
    'utf8',
  )
  const tef = readFileSync(
    resolve(process.cwd(), 'src/components/time-entry/create-time-entry-form.tsx'),
    'utf8',
  )

  // 1. comment 投稿 button 動的
  if (/<span aria-hidden="true">\{create\.isPending \? '送信中…' : '投稿'\}<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-post visible 動的 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-post visible aria-hidden 未統合` })
  }

  // 2. comment 編集 cancel
  if ((ct.match(/<span aria-hidden="true">キャンセル<\/span>/g) ?? []).length >= 1) {
    findings.push({
      level: 'info',
      message: `comment-edit-cancel visible aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-edit-cancel visible aria-hidden 未統合` })
  }

  // 3. comment 編集保存
  if (/<span aria-hidden="true">保存<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-save visible "保存" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-save visible aria-hidden 未統合` })
  }

  // 4. comment 行内 編集
  if (/<span aria-hidden="true">編集<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-edit row visible "編集" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-edit row visible aria-hidden 未統合` })
  }

  // 5. comment 行内 削除
  if (/<span aria-hidden="true">削除<\/span>/.test(ct)) {
    findings.push({
      level: 'info',
      message: `comment-delete row visible "削除" aria-hidden 統合 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `comment-delete row visible aria-hidden 未統合` })
  }

  // 6. time-entry submit 動的
  if (/<span aria-hidden="true">\{create\.isPending \? '\.\.\.' : '記録'\}<\/span>/.test(tef)) {
    findings.push({
      level: 'info',
      message: `create-time-entry-submit visible 動的 aria-hidden 統合 OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `create-time-entry-submit visible aria-hidden 未統合`,
    })
  }

  // 7. iter874 invariant: team-capacity 3 aria-hidden
  const tcp = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-capacity-panel.tsx'),
    'utf8',
  )
  if (
    /<span aria-hidden="true">\{name\}<\/span>/.test(tcp) &&
    (
      tcp.match(/<span aria-hidden="true">\n\s+<span className="text-muted-foreground mr-1">今/g) ??
      []
    ).length >= 2
  ) {
    findings.push({
      level: 'info',
      message: `iter874 invariant: team-capacity aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter874 invariant: 破壊` })
  }

  // 8. iter735 invariant
  const tce = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/team-context-editor.tsx'),
    'utf8',
  )
  const tceMatches = tce.match(/aria-keyshortcuts="Meta\+Enter Control\+Enter"/g) ?? []
  if (tceMatches.length >= 2) {
    findings.push({
      level: 'info',
      message: `iter735 invariant: team-context-editor aria-keyshortcuts 維持 OK (${tceMatches.length} 箇所)`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter735 invariant: 破壊` })
  }

  console.log(`\n=== Findings (comment-thread-time-entry-form-aria-hidden-iter875) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
