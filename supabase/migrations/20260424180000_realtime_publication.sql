-- ================================================================
-- Realtime publication for items / comments / notifications
-- ================================================================
-- Supabase Realtime は `supabase_realtime` publication にテーブルを追加すると
-- 各 row の INSERT / UPDATE / DELETE が postgres_changes チャンネルに流れる。
--
-- RLS は Realtime も尊重するので、authenticated ロールで購読した場合に
-- workspace 非 member にデータが漏れることは無い。
--
-- MVP では items / comments_on_items / notifications だけ公開。
-- docs は頻度低 + agent が更新するため実装優先度下げる (Day 20 で見直し)。
-- ================================================================

-- 既に publication がある環境 (Supabase managed) では CREATE 不要。
-- local docker では空で存在するので DROP/CREATE の idempotent セット。
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end$$;

-- REPLICA IDENTITY FULL: UPDATE イベントで old row の全カラムを送る
--   → client が before 値にアクセス可能 (動的 reorder で必要)
alter table public.items replica identity full;
alter table public.comments_on_items replica identity full;
alter table public.notifications replica identity full;

-- 既に publication member なら重複エラーを握りつぶす (idempotent)
do $$
begin
  begin
    alter publication supabase_realtime add table public.items;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.comments_on_items;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end$$;
