-- =====================================================================
-- Phase 5.1: sprints テーブルの RLS
-- =====================================================================
-- - SELECT: workspace member 全員 (filter は repository で deleted_at IS NULL を強制)
--   注意: SELECT policy に soft delete 条件を入れない (CLAUDE.md §5.1)
-- - INSERT / UPDATE: workspace の member 以上
-- - DELETE: 物理削除しない (status='cancelled' で代替) — 念のため policy 出さず service_role のみ
-- - audit_log: service 層で recordAudit を呼ぶ
-- =====================================================================

alter table public.sprints enable row level security;

create policy "sprints: workspace read"
on public.sprints for select
to authenticated
using (is_workspace_member(workspace_id));

create policy "sprints: workspace insert"
on public.sprints for insert
to authenticated
with check (has_workspace_role(workspace_id, 'member'));

create policy "sprints: workspace update"
on public.sprints for update
to authenticated
using (has_workspace_role(workspace_id, 'member'))
with check (has_workspace_role(workspace_id, 'member'));

-- DELETE policy は意図的に作らない (status で論理削除)
