/**
 * iter270 refactor: ISO 日付 (`YYYY-MM-DD`) の `start <= end` 制約を判定する
 * 純粋ヘルパ。
 *
 * 散らばっていた箇所:
 *  - item-edit-dialog.tsx (`startDate > dueDate`)
 *  - sprints-panel.tsx (`endDate < startDate`) × 2
 *  - goals-panel.tsx (`endDate < startDate`)
 *
 * いずれも「両方が非空文字 + ISO 文字列辞書順比較」で同じ判定をしているが、
 * 記述方向 (`>` / `<`)・フィールド名 (`dueDate` / `endDate`)・空文字判定が
 * 微妙に違って drift しやすかった。本 helper で「日付範囲が不正か」を 1 か所に
 * 集約する。エラー文面は呼び出し元 (期限 / 終了日 / etc.) に残す。
 *
 * 仕様:
 *  - 片方が `null` / `undefined` / 空文字 → false (= まだ判定できない)
 *  - 両方が ISO 文字列で `end < start` (辞書順) → true (= 不正)
 *  - 両方同一日 → false (= OK; 単日タスク / 単日 Sprint を許容)
 *
 * ISO `YYYY-MM-DD` は辞書順 == 時系列順なので `Date` 化は不要 (TZ 影響もなし)。
 */

/** 日付範囲が `start <= end` 制約を満たさないか (true = 不正)。 */
export function isInvalidDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): boolean {
  if (!start || !end) return false
  return end < start
}
