-- =============================================================================
-- Migração 010 — "Aprovar" conta também confirma o e-mail no Supabase Auth.
-- Hoje o botão "Aprovar" só muda public.profiles.account_status; o campo que
-- o login realmente verifica (auth.users.email_confirmed_at) não é tocado.
-- Se o usuário nunca recebeu/clicou o link de confirmação (ex.: e-mail
-- digitado errado no cadastro), a conta fica presa mesmo depois de aprovada.
-- Esta migração faz "Aprovar" confirmar o e-mail junto.
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
-- Seguro rodar mais de uma vez.
-- =============================================================================

create or replace function public.fn_admin_set_account_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;
  if p_status not in ('pending', 'active', 'blocked') then
    raise exception 'Status inválido';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Você não pode alterar o status da própria conta';
  end if;

  update public.profiles set account_status = p_status where id = p_user_id;

  -- Aprovar a conta libera o acesso; confirma o e-mail junto, senão o login
  -- continua barrado pelo Supabase Auth mesmo com a conta "active".
  if p_status = 'active' then
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = p_user_id;
  end if;
end;
$$;

grant execute on function public.fn_admin_set_account_status(uuid, text) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 010
-- =============================================================================
