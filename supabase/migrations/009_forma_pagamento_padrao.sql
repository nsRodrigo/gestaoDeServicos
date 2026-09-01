-- =============================================================================
-- Migração 009 — Forma de pagamento padrão (is_default), isolada.
-- Existe porque a migração 003_forma_pagamento_padrao_obrigatoria.sql nunca foi
-- rodada neste banco, e não pode ser rodada agora sem conflito: ela também
-- redefine fn_create_appointment/fn_update_appointment SEM o parâmetro
-- p_target_user_id que a migração 006 (já aplicada) adicionou depois. Rodar a
-- 003 agora criaria uma segunda versão dessas funções com assinatura diferente.
-- Esta migração traz só a parte de "forma de pagamento padrão" da 003, sem
-- tocar em fn_create_appointment/fn_update_appointment.
-- Rode este arquivo INTEIRO no SQL Editor do Supabase. Seguro rodar mais de uma vez.
-- =============================================================================

alter table public.payment_methods add column if not exists is_default boolean not null default false;

-- Garante no máximo uma forma de pagamento marcada como padrão por usuário.
create unique index if not exists idx_payment_methods_one_default
  on public.payment_methods(user_id) where is_default;

-- Troca a forma de pagamento padrão de forma atômica (desmarca a antiga, marca a nova).
create or replace function public.fn_set_default_payment_method(p_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if not exists (select 1 from public.payment_methods where id = p_id and user_id = v_user) then
    raise exception 'Forma de pagamento inválida';
  end if;
  update public.payment_methods set is_default = false where user_id = v_user and is_default;
  update public.payment_methods set is_default = true where id = p_id;
end;
$$;

grant execute on function public.fn_set_default_payment_method(uuid) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 009
-- =============================================================================
