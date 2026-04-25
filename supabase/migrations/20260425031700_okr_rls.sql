-- =====================================================================
-- Phase 5.2: OKR (goals + key_results) RLS
-- =====================================================================
-- - SELECT: workspace member 全員 (filter は repository で deleted_at IS NULL を強制)
-- - INSERT/UPDATE: member 以上
-- - DELETE: 物理削除しない (status='archived' で代替) — policy 出さず service_role のみ
-- - key_results は goal を辿って ws を判定 (一旦 service 層で goal を取得した上で操作する想定)
-- =====================================================================

alter table public.goals enable row level security;

create policy "goals: workspace read"
on public.goals for select
to authenticated
using (is_workspace_member(workspace_id));

create policy "goals: workspace insert"
on public.goals for insert
to authenticated
with check (has_workspace_role(workspace_id, 'member'));

create policy "goals: workspace update"
on public.goals for update
to authenticated
using (has_workspace_role(workspace_id, 'member'))
with check (has_workspace_role(workspace_id, 'member'));

-- DELETE policy なし

alter table public.key_results enable row level security;

create policy "key_results: workspace read"
on public.key_results for select
to authenticated
using (
  exists (
    select 1 from public.goals g
    where g.id = key_results.goal_id
      and is_workspace_member(g.workspace_id)
  )
);

create policy "key_results: workspace insert"
on public.key_results for insert
to authenticated
with check (
  exists (
    select 1 from public.goals g
    where g.id = key_results.goal_id
      and has_workspace_role(g.workspace_id, 'member')
  )
);

create policy "key_results: workspace update"
on public.key_results for update
to authenticated
using (
  exists (
    select 1 from public.goals g
    where g.id = key_results.goal_id
      and has_workspace_role(g.workspace_id, 'member')
  )
)
with check (
  exists (
    select 1 from public.goals g
    where g.id = key_results.goal_id
      and has_workspace_role(g.workspace_id, 'member')
  )
);
