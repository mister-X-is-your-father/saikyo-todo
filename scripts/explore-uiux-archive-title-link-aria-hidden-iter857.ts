/**
 * Phase 6.15 loop iter 857 (mode-D Desktop a11y) —
 * archived-items-panel title link visible {item.title} を aria-hidden span で wrap。
 *
 * 課題: src/components/workspace/archived-items-panel.tsx 行 136-143 の
 *   archive-title-link は aria-label "「title」を開く (archivedAt にアーカイブ)"
 *   が完全 content を含むのに visible {item.title} は aria-hidden 無し →
 *   SR 2 経路読み上げ重複。iter829 (archive-restore button) と同 file 内 sibling
 *   の規約一致 fix。iter844-856 と同 vocabulary。
 *
 * fix (1 ファイル +1/-1 行):
 *   - <span aria-hidden="true">{item.title}</span>
 *
 * 検証: source-side regex assert + iter829 (restore button) / iter678
 *   (archive link focus) invariant + iter853-856 cross-check。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface Finding {
  level: 'error' | 'warning' | 'info'
  message: string
}

async function main(): Promise<void> {
  const findings: Finding[] = []

  const aip = readFileSync(
    resolve(process.cwd(), 'src/components/workspace/archived-items-panel.tsx'),
    'utf8',
  )

  if (
    /data-testid=\{`archive-title-link-\$\{item\.id\}`\}[\s\S]*?<span aria-hidden="true">\{item\.title\}<\/span>/.test(
      aip,
    )
  ) {
    findings.push({
      level: 'info',
      message: `iter857: archive title-link visible {item.title} aria-hidden OK`,
    })
  } else {
    findings.push({
      level: 'warning',
      message: `iter857: archive title-link visible {item.title} aria-hidden 不完全`,
    })
  }

  // iter829 invariant: restore button aria-hidden
  if (/<span aria-hidden="true">\{unarchive\.isPending \? '復元中…' : '復元'\}<\/span>/.test(aip)) {
    findings.push({
      level: 'info',
      message: `iter829 invariant: archive restore button aria-hidden 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter829 invariant: 破壊` })
  }

  // iter857 invariant: title link aria-label / data-testid 維持
  if (
    /aria-label=\{`「\$\{item\.title\}」を開く \(\$\{fmt\(item\.archivedAt\)\} にアーカイブ\)`\}/.test(
      aip,
    ) &&
    /data-testid=\{`archive-title-link-\$\{item\.id\}`\}/.test(aip)
  ) {
    findings.push({
      level: 'info',
      message: `iter857 invariant: archive title-link 属性維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter857 invariant: 属性破壊` })
  }

  // iter856 invariant: inbox-view empty quick-add aria-hidden
  const iv = readFileSync(resolve(process.cwd(), 'src/components/workspace/inbox-view.tsx'), 'utf8')
  if (/<span aria-hidden="true">クイック追加にフォーカス \(キー: q\)<\/span>/.test(iv)) {
    findings.push({
      level: 'info',
      message: `iter856 invariant: inbox-view empty quick-add 維持 OK`,
    })
  } else {
    findings.push({ level: 'warning', message: `iter856 invariant: 破壊` })
  }

  console.log(`\n=== Findings (archive-title-link-aria-hidden-iter857) ===`)
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`)
  console.log(`\nTotal: ${findings.length}`)

  const fatal = findings.some((f) => f.level === 'warning' || f.level === 'error')
  process.exit(fatal ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
