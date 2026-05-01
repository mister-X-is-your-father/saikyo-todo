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
import { scheduleCreatePart, scheduleStartTimerPart, scheduleStopTimerPart } from './parts/schedule'
import { timeEntryCreatePart } from './parts/time-entry'
import { registerPart } from './registry'

let initialized = false

export function bootstrapAutomationParts(): void {
  if (initialized) return
  initialized = true
  registerPart(itemCreatePart)
  registerPart(itemUpdatePart)
  registerPart(itemCompletePart)
  registerPart(itemListPart)
  registerPart(scheduleCreatePart)
  registerPart(scheduleStartTimerPart)
  registerPart(scheduleStopTimerPart)
  registerPart(commentCreateOnItemPart)
  registerPart(commentListForItemPart)
  registerPart(timeEntryCreatePart)
  // AP-2 残 / AP-3 でここに notify / slack / ai / external 追加
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
