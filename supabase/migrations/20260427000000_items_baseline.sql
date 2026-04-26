-- Phase 6.15 iter 47: Gantt baseline (TeamGantt 風)
--
-- start_date / due_date のスナップショット列を追加。
-- Gantt 上で「当初計画 (baseline) vs 現在 (actual)」の比較を出すための土台。
--
-- 列方針:
--   - baseline_start_date / baseline_end_date は date NULL 許容 (一度も baseline 取って
--     いない item は両方 NULL)
--   - baseline_taken_at は timestamptz、いつ baseline を確定したかの監査用
--   - 整合性 CHECK: 両方セットされている場合のみ baseline_start_date <= baseline_end_date
--
-- 取り込み方:
--   - Sprint 開始時 / 計画凍結時に setBaseline(itemId) で current start/due を写す想定
--   - UI は次 iter で実装。本 iter は schema のみ。

ALTER TABLE items
  ADD COLUMN baseline_start_date date,
  ADD COLUMN baseline_end_date date,
  ADD COLUMN baseline_taken_at timestamptz;

ALTER TABLE items
  ADD CONSTRAINT items_baseline_dates_check
  CHECK (
    baseline_start_date IS NULL
    OR baseline_end_date IS NULL
    OR baseline_start_date <= baseline_end_date
  );

-- どちらか片方だけ NULL は禁止 (baseline は範囲スナップなので両方揃う前提)
ALTER TABLE items
  ADD CONSTRAINT items_baseline_pair_check
  CHECK (
    (baseline_start_date IS NULL) = (baseline_end_date IS NULL)
  );
