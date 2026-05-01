/**
 * queue: AP-1 substrate — AutomationPart の registry。
 *
 * 静的 register pattern (動的 plugin 化は POST_MVP)。
 * 起動時に各 part が自身を `registerPart(...)` で登録、消費側 (workflow engine /
 * agent tool / MCP server) は `getPart(id)` / `listParts(filter?)` で参照する。
 *
 * iter595 refactor: buildPartManifest を追加し、AP-5 (Anthropic SDK tool spec) /
 * AP-6 (MCP server tool spec) の bridge 用に zod → JSON Schema を 1 関数で取れる。
 */
import { z } from 'zod'

import type {
  AnyPart,
  AutomationPart,
  PartCategory,
  PartManifestEntry,
  PartSideEffect,
} from './types'

const registry = new Map<string, AnyPart>()

export function registerPart<I, O>(part: AutomationPart<I, O>): void {
  if (registry.has(part.id)) {
    throw new Error(`AutomationPart "${part.id}" は既に登録済みです`)
  }
  registry.set(part.id, part as AnyPart)
}

export function getPart(id: string): AnyPart | undefined {
  return registry.get(id)
}

export function requirePart(id: string): AnyPart {
  const p = registry.get(id)
  if (!p) throw new Error(`AutomationPart "${id}" は未登録です`)
  return p
}

export function listParts(filter?: {
  category?: PartCategory
  sideEffect?: PartSideEffect
}): AnyPart[] {
  let parts = Array.from(registry.values())
  if (filter?.category) parts = parts.filter((p) => p.category === filter.category)
  if (filter?.sideEffect) parts = parts.filter((p) => p.sideEffect === filter.sideEffect)
  return parts.sort((a, b) => a.id.localeCompare(b.id))
}

/** test / hot reload 用。本番経路では呼ばない。 */
export function _resetRegistryForTesting(): void {
  registry.clear()
}

/**
 * iter595 refactor: 1 part を JSON Schema 込みの manifest entry に変換。
 *
 * AP-5 (Anthropic SDK tool definition) / AP-6 (MCP server tool spec) の両方が
 * 「id / label / description + JSON Schema (input/output)」 の形を要求するため、
 * manifest 形式を 1 関数で生成して bridge を集約する。
 *
 * z.toJSONSchema は zod 4 native (= 外部 dep 不要)、JSON Schema Draft 2020-12 出力。
 */
export function buildPartManifestEntry(part: AnyPart): PartManifestEntry {
  return {
    id: part.id,
    label: part.label,
    description: part.description,
    category: part.category,
    sideEffect: part.sideEffect,
    inputJsonSchema: z.toJSONSchema(part.input),
    outputJsonSchema: z.toJSONSchema(part.output),
  }
}

/**
 * iter595 refactor: registry 全 part を manifest 配列で取得する。
 *
 * filter は listParts と同じ shape。AP-5 / AP-6 で「workspace user の write scope
 * key で許可される part のみ」「read 系 part のみ」 等の絞込に使う。
 */
export function buildPartManifest(filter?: {
  category?: PartCategory
  sideEffect?: PartSideEffect
}): PartManifestEntry[] {
  return listParts(filter).map(buildPartManifestEntry)
}
