-- =====================================================================
-- Auth トリガ + Workspace 作成 RPC
-- =====================================================================
-- 1. auth.users 作成時に public.profiles を自動作成
-- 2. workspace 作成は SECURITY DEFINER 関数で原子的に行う
--    (RLS が有効な workspace_members に owner として自分を入れる必要があるが、
--     まだメンバーではないため has_workspace_role('admin') を満たせない → catch-22)
-- =====================================================================

-- ---------- 1. handle_new_user (auth.users → profiles) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, locale, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'locale', 'ja'),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Asia/Tokyo')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. create_workspace (RPC) ----------
-- 引数: name, slug
-- 戻り値: workspace_id
-- 処理: workspace 作成 + owner 登録 + 設定 + デフォルト status 3 件 + audit_log
create or replace function public.create_workspace(ws_name text, ws_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into public.workspaces (name, slug, owner_id, created_by_actor_type, created_by_actor_id)
  values (ws_name, ws_slug, uid, 'user', uid)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, uid, 'owner');

  insert into public.workspace_settings (workspace_id) values (ws_id);

  insert into public.workspace_statuses (workspace_id, key, label, color, "order", type) values
    (ws_id, 'todo',        'TODO',     '#94a3b8', 1, 'todo'),
    (ws_id, 'in_progress', '進行中',   '#3b82f6', 2, 'in_progress'),
    (ws_id, 'done',        '完了',     '#22c55e', 3, 'done');

  insert into public.audit_log (workspace_id, actor_type, actor_id, target_type, target_id, action, after)
  values (
    ws_id, 'user', uid, 'workspace', ws_id, 'create',
    jsonb_build_object('name', ws_name, 'slug', ws_slug)
  );

  return ws_id;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;
