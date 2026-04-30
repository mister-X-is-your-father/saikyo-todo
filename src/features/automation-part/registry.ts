/**
 * queue: AP-1 substrate — AutomationPart の registry。
 *
 * 静的 register pattern (動的 plugin 化は POST_MVP)。
 * 起動時に各 part が自身を `registerPart(...)` で登録、消費側 (workflow engine /
 * agent tool / MCP server) は `getPart(id)` / `listParts(filter?)` で参照する。
 */
import type { AnyPart, AutomationPart, PartCategory, PartSideEffect } from './types'

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
