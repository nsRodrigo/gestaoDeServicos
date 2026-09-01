-- =============================================================================
-- Migração 007 — Administrador consegue excluir permanentemente uma conta
-- (empresa/usuário). Apaga o usuário de auth.users; profile, serviços,
-- produtos, clientes, formas de pagamento e atendimentos somem juntos, porque
-- todos já apontam para auth.users com "on delete cascade".
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
-- Seguro rodar mais de uma vez.
-- =============================================================================

create or replace function public.fn_admin_delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Você não pode excluir a própria conta';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.fn_admin_delete_account(uuid) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 007
-- =============================================================================
