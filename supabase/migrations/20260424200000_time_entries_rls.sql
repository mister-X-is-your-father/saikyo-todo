-- =====================================================================
-- RLS ポリシー: time_entries + mock_timesheet_entries
-- =====================================================================
-- time_entries:
--   - SELECT: workspace member (越境不可、deleted_at フィルタは Repository 側)
--   - INSERT: workspace member かつ user_id = auth.uid() (本人分のみ書ける)
--   - UPDATE: 同上 (with check で user_id を固定、soft-delete は deleted_at 付与)
--   - DELETE: service_role のみ (false)
--
-- mock_timesheet_entries:
--   - 本体アプリの外 (Playwright が叩く先) なので RLS を有効化しない。
--     * authenticated ロールから直接 insert/select される想定はない
--     * adminDb 経由もしくは mock の Server Action (admin key) で書き込まれる
-- =====================================================================

alter table public.time_entries enable row level security;

create policy "time_entries: ws members read"
on public.time_entries for select to authenticated
using (is_workspace_member(workspace_id));

create policy "time_entries: self insert"
on public.time_entries for insert to authenticated
with check (
  is_workspace_member(workspace_id)
  and user_id = (select auth.uid())
);

create policy "time_entries: self update (active rows)"
on public.time_entries for update to authenticated
using (
  is_workspace_member(workspace_id)
  and user_id = (select auth.uid())
  and deleted_at is null
)
with check (
  is_workspace_member(workspace_id)
  and user_id = (select auth.uid())
);

create policy "time_entries: no delete (service only)"
on public.time_entries for delete to authenticated
using (false);

-- mock_timesheet_entries は RLS を有効化しない (アプリ外論理テーブル)
-- 将来 authenticated から参照させたい場合はここで enable + policy 追加する
