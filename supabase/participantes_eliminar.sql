-- Permite a los administradores eliminar participantes desde el panel.
-- Cómo aplicarlo: Supabase → SQL Editor → pegar este archivo → Run.
drop policy if exists participantes_admin_delete on public.participantes;
create policy participantes_admin_delete
on public.participantes for delete
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
