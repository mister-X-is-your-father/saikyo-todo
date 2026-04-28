/**
 * iter303 basics: Kanban カードの「done / blocked」視覚 hint を返す pure helper。
 *
 * `kanban-view.tsx` の KanbanCard 内 inline 定義から抽出して単体テスト可能に。
 * Component 本体は project policy で test しないが、status → border/bg のマッピングは
 * UI から切り離せて UI 動作の前提となるので unit test で押さえる。
 *
 * 視覚仕様 (FEEDBACK_QUEUE「Kanban カード: 完了 / blocked の視覚 hint を強化」消化):
 *  - `blocked` → 左 4px amber border + amber/30 背景。column と二重で強調
 *  - `done` → 左 4px emerald border + emerald/15 背景。line-through を補強
 *  - その他 (todo / in_progress / cancelled / 未知) → 装飾なし (空文字 border + bg-background)
 */

export interface CardStatusAccent {
  /** 左端 accent border の Tailwind class (空文字なら装飾なし) */
  borderClass: string
  /** カード背景の Tailwind class (装飾なしは `bg-background`) */
  bgClass: string
}

const ACCENT_MAP: Record<string, CardStatusAccent> = {
  blocked: {
    borderClass: 'border-l-4 border-l-amber-500',
    bgClass: 'bg-amber-50/40 dark:bg-amber-950/20',
  },
  done: {
    borderClass: 'border-l-4 border-l-emerald-500',
    bgClass: 'bg-emerald-50/30 dark:bg-emerald-950/15',
  },
}

const DEFAULT_ACCENT: CardStatusAccent = {
  borderClass: '',
  bgClass: 'bg-background',
}

/**
 * Item.status から Kanban カード装飾を返す。`done` / `blocked` 以外は装飾なし。
 * 未知 / null / undefined / 空文字も装飾なし扱いで fail-soft。
 */
export function getCardStatusAccent(status: string | null | undefined): CardStatusAccent {
  if (!status) return DEFAULT_ACCENT
  return ACCENT_MAP[status] ?? DEFAULT_ACCENT
}
