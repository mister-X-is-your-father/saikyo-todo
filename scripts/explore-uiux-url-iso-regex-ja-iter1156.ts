/**
 * Phase 6.15 loop iter1156: url() + ISO_DATE/ISO_TIME regex() に ja message 付与
 * regression guard。
 *
 * iter1156 で発見した bug:
 *   - external-source/schema.ts: baseUrl / CustomRest url の .url() に ja message 無し
 *   - item-metadata/schema.ts: AddItemIoArtifact url の .url() に ja message 無し
 *   - item/schema.ts: startDate/dueDate/scheduledFor.regex(ISO_DATE) + dueTime.regex(ISO_TIME)
 *     計 8 callsite (Create 4 + Update 4) に ja message 無く zod default 英語が露出
 *
 * iter1086/1092/1126-1155 sweep 継続。real Supabase 不要、source 直読 invariant。
 *
 * 実行: pnpm tsx --env-file=.env.local scripts/explore-uiux-url-iso-regex-ja-iter1156.ts
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

  const externalSrc = readFileSync(
    resolve(here, '../src/features/external-source/schema.ts'),
    'utf8',
  )
  const metadataSrc = readFileSync(resolve(here, '../src/features/item-metadata/schema.ts'), 'utf8')
  const itemSrc = readFileSync(resolve(here, '../src/features/item/schema.ts'), 'utf8')

  // URL ja message: 3 出現 (external-source baseUrl + url, item-metadata url)
  const urlMsg = "'正しい URL を入力してください'"
  const externalUrlCnt = externalSrc.split(urlMsg).length - 1
  if (externalUrlCnt < 2) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `external-source に ${urlMsg} が ${externalUrlCnt} 件 (baseUrl + url で 2 件期待)`,
    })
  }
  if (!metadataSrc.includes(urlMsg)) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item-metadata に ${urlMsg} が無い`,
    })
  }

  // ISO_DATE / ISO_TIME ja message constant 定義
  if (!itemSrc.includes("'YYYY-MM-DD 形式で入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item/schema.ts に ISO_DATE_MSG ja message が無い`,
    })
  }
  if (!itemSrc.includes("'HH:MM 形式で入力してください'")) {
    findings.push({
      level: 'error',
      source: 'a11y',
      message: `item/schema.ts に ISO_TIME_MSG ja message が無い`,
    })
  }

  // regex(ISO_DATE, ISO_DATE_MSG) の 6 callsite (Create 3 + Update 3、scheduledFor 含む)
  // regex(ISO_TIME, ISO_TIME_MSG) の 2 callsite (Create 1 + Update 1)
  const dateMsgUseCnt = itemSrc.split('regex(ISO_DATE, ISO_DATE_MSG)').length - 1
  const timeMsgUseCnt = itemSrc.split('regex(ISO_TIME, ISO_TIME_MSG)').length - 1
  if (dateMsgUseCnt < 6) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `item/schema.ts ISO_DATE_MSG 適用が ${dateMsgUseCnt} 件 (Create 3 + Update 3 = 6 期待)`,
    })
  }
  if (timeMsgUseCnt < 2) {
    findings.push({
      level: 'warning',
      source: 'a11y',
      message: `item/schema.ts ISO_TIME_MSG 適用が ${timeMsgUseCnt} 件 (Create 1 + Update 1 = 2 期待)`,
    })
  }

  console.log('=== Findings ===')
  if (findings.length === 0) {
    console.log('(なし) — URL + ISO_DATE/ISO_TIME regex 全部位に ja message 統一済')
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
