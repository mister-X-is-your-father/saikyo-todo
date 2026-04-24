-- Day 12: items.done_at — status が "done" type に遷移したら now()、離脱したら NULL。
--   - burndown 計算を単純化するため (audit_log に頼らずに済む)
--   - BEFORE INSERT OR UPDATE OF status trigger で自動維持
--   - Service 層は触らない (既存 updateStatus は変更不要)

alter table public.items add column if not exists done_at timestamptz;
create index if not exists items_done_at_idx on public.items (workspace_id, done_at);

create or replace function public.set_item_done_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_is_done boolean;
  old_is_done boolean;
begin
  select (type = 'done') into new_is_done
    from public.workspace_statuses
    where workspace_id = NEW.workspace_id and key = NEW.status;

  if new_is_done is null then
    new_is_done := false;
  end if;

  if TG_OP = 'UPDATE' then
    select (type = 'done') into old_is_done
      from public.workspace_statuses
      where workspace_id = OLD.workspace_id and key = OLD.status;
    if old_is_done is null then
      old_is_done := false;
    end if;
  else
    old_is_done := false;
  end if;

  if new_is_done and not old_is_done then
    NEW.done_at := now();
  elsif not new_is_done and old_is_done then
    NEW.done_at := null;
  end if;

  return NEW;
end;
$$;

drop trigger if exists items_done_at_sync on public.items;
create trigger items_done_at_sync
before insert or update of status on public.items
for each row execute function public.set_item_done_at();

-- 既存 items に backfill (status type = 'done' なら updated_at を done_at として使う)
update public.items i
set done_at = i.updated_at
from public.workspace_statuses s
where s.workspace_id = i.workspace_id
  and s.key = i.status
  and s.type = 'done'
  and i.done_at is null;
