/**
 * iter600 refactor: parts/*.test.ts の共有 fixture。
 *
 * zod 4 の uuid() validator は「v4-7 の version field + 8-9-a-b の variant field」
 * を厳格 check する (= all-zero UUID は invalid)。test fixture id を 4 file で重複
 * 定義していたのを 1 file に集約、新 part 追加時の漏れを予防する。
 *
 * 値は v4 形式 (3rd group の `4xxx`) を採用、deterministic で test 出力の安定化に
 * 寄与する (random uuid は snapshot test 等で揺れの原因)。
 */

/** 主要 fixture id (v4 形式の deterministic uuid)。 */
export const VALID_FIXTURE_ID = '01234567-89ab-4123-89ab-0123456789ab'

/** 第二 fixture id (idempotencyKey 等で「同 input 内で別 uuid」が必要な test 用)。 */
export const ALT_FIXTURE_ID = '11111111-2222-4333-8444-555555555555'
