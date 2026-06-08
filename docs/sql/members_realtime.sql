-- Enable Supabase Realtime for admin members list (run in Supabase SQL Editor)
do $$
begin
  alter publication supabase_realtime add table public.members;
exception
  when duplicate_object then
    raise notice 'members already in supabase_realtime publication';
  when others then
    raise notice 'members realtime: %', sqlerrm;
end $$;
