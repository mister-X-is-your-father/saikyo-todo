/**
 * queue: AP-1 substrate — AutomationPart の bootstrap (起動時 register)。
 *
 * 各 part を import + registerPart() で静的に登録。
 * 利用側 (workflow engine / agent tool / MCP server) は本 file を一度 import すれば
 * `getPart(id)` / `listParts()` 経由で全 part にアクセスできる。
 */
import 'server-only'

import { commentCreateOnItemPart, commentListForItemPart } from './parts/comment'
import { itemCompletePart, itemCreatePart, itemListPart, itemUpdatePart } from './parts/item'
import {
  scheduleCreatePart,
  scheduleStartTimerPart,
  scheduleStopTimerPart,
  scheduleUpdatePart,
} from './parts/schedule'
import { timeEntryCreatePart } from './parts/time-entry'
import { registerPart } from './registry'
import type { AnyPart } from './types'

/**
 * iter605 refactor: 11 件の registerPart() 列挙を array に集約。新 part 追加時は
 * import + ALL_PARTS の末尾に 1 行追加で済むため、AP-3 / AP-4 で part 数が増える
 * 段階で「import 漏れ / register 漏れ」 の差分を最小化できる。
 *
 * Object 形ではなく配列にしてあるのは、登録順 = listParts() の sort 前の挿入順 で
 * 規定したいため (試験 _resetRegistryForTesting → bootstrap で反復可能)。
 */
const ALL_PARTS: readonly AnyPart[] = [
  itemCreatePart as AnyPart,
  itemUpdatePart as AnyPart,
  itemCompletePart as AnyPart,
  itemListPart as AnyPart,
  scheduleCreatePart as AnyPart,
  scheduleStartTimerPart as AnyPart,
  scheduleStopTimerPart as AnyPart,
  scheduleUpdatePart as AnyPart,
  commentCreateOnItemPart as AnyPart,
  commentListForItemPart as AnyPart,
  timeEntryCreatePart as AnyPart,
  // AP-2 残 / AP-3 でここに notify / slack / ai / external 追加 (1 行で OK)
]

let initialized = false

export function bootstrapAutomationParts(): void {
  if (initialized) return
  initialized = true
  for (const p of ALL_PARTS) registerPart(p)
}

// module load 時に自動 bootstrap (test では _resetRegistryForTesting → bootstrap で reload)
bootstrapAutomationParts()

export {
  _resetRegistryForTesting,
  buildPartManifest,
  buildPartManifestEntry,
  getPart,
  listParts,
  requirePart,
} from './registry'
export type {
  AnyPart,
  AutomationPart,
  PartCategory,
  PartContext,
  PartManifestEntry,
  PartSideEffect,
} from './types'
export { definePart } from './types'
