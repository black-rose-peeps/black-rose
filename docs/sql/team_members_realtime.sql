-- Enable Supabase Realtime for team roster + invite updates (run in Supabase SQL Editor)
do $$
begin
  alter publication supabase_realtime add table public.team_members;
exception
  when duplicate_object then
    raise notice 'team_members already in supabase_realtime publication';
  when others then
    raise;
end $$;
