-- Enable Supabase Realtime for tournament registration status updates (run in Supabase SQL Editor)
do $$
begin
  alter publication supabase_realtime add table public.tournament_registrations;
exception
  when duplicate_object then
    raise notice 'tournament_registrations already in supabase_realtime publication';
  when others then
    raise;
end $$;
