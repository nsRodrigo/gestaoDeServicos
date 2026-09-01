-- =============================================================================
-- Migração 005 — Administrador geral, cadastro com aprovação, bloqueio de contas
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
-- Seguro rodar mais de uma vez.
--
-- Depois de rodar, promova a SUA conta a administrador rodando (troque o e-mail):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'SEU-EMAIL-AQUI@exemplo.com');
-- =============================================================================

alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin'));
-- 'active' é o default da coluna (contas já existentes continuam funcionando normalmente).
-- Cadastros novos entram como 'pending' explicitamente via handle_new_user (abaixo).
alter table public.profiles add column if not exists account_status text not null default 'active' check (account_status in ('pending', 'active', 'blocked'));

-- Cadastros feitos pelo próprio app (tela "Criar conta") entram como 'pending' e ficam
-- bloqueados até o administrador aprovar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, account_status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =============================================================================
-- HELPERS
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active');
$$;

-- =============================================================================
-- RLS: contas pendentes/bloqueadas perdem acesso aos próprios dados de negócio;
-- o administrador passa a enxergar (e editar) os dados de qualquer conta.
-- =============================================================================

-- services
drop policy if exists services_select on public.services;
drop policy if exists services_insert on public.services;
drop policy if exists services_update on public.services;
drop policy if exists services_delete on public.services;
drop policy if exists services_admin_all on public.services;
create policy services_select on public.services for select using (user_id = auth.uid() and public.is_active_account());
create policy services_insert on public.services for insert with check (user_id = auth.uid() and public.is_active_account());
create policy services_update on public.services for update using (user_id = auth.uid() and public.is_active_account()) with check (user_id = auth.uid() and public.is_active_account());
create policy services_delete on public.services for delete using (user_id = auth.uid() and public.is_active_account());
create policy services_admin_all on public.services for all using (public.is_admin()) with check (public.is_admin());

-- products
drop policy if exists products_select on public.products;
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;
drop policy if exists products_admin_all on public.products;
create policy products_select on public.products for select using (user_id = auth.uid() and public.is_active_account());
create policy products_insert on public.products for insert with check (user_id = auth.uid() and public.is_active_account());
create policy products_update on public.products for update using (user_id = auth.uid() and public.is_active_account()) with check (user_id = auth.uid() and public.is_active_account());
create policy products_delete on public.products for delete using (user_id = auth.uid() and public.is_active_account());
create policy products_admin_all on public.products for all using (public.is_admin()) with check (public.is_admin());

-- clients
drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;
drop policy if exists clients_admin_all on public.clients;
create policy clients_select on public.clients for select using (user_id = auth.uid() and public.is_active_account());
create policy clients_insert on public.clients for insert with check (user_id = auth.uid() and public.is_active_account());
create policy clients_update on public.clients for update using (user_id = auth.uid() and public.is_active_account()) with check (user_id = auth.uid() and public.is_active_account());
create policy clients_delete on public.clients for delete using (user_id = auth.uid() and public.is_active_account());
create policy clients_admin_all on public.clients for all using (public.is_admin()) with check (public.is_admin());

-- payment_methods
drop policy if exists payment_methods_select on public.payment_methods;
drop policy if exists payment_methods_insert on public.payment_methods;
drop policy if exists payment_methods_update on public.payment_methods;
drop policy if exists payment_methods_delete on public.payment_methods;
drop policy if exists payment_methods_admin_all on public.payment_methods;
create policy payment_methods_select on public.payment_methods for select using (user_id = auth.uid() and public.is_active_account());
create policy payment_methods_insert on public.payment_methods for insert with check (user_id = auth.uid() and public.is_active_account());
create policy payment_methods_update on public.payment_methods for update using (user_id = auth.uid() and public.is_active_account()) with check (user_id = auth.uid() and public.is_active_account());
create policy payment_methods_delete on public.payment_methods for delete using (user_id = auth.uid() and public.is_active_account());
create policy payment_methods_admin_all on public.payment_methods for all using (public.is_admin()) with check (public.is_admin());

-- appointments
drop policy if exists appointments_select on public.appointments;
drop policy if exists appointments_insert on public.appointments;
drop policy if exists appointments_update on public.appointments;
drop policy if exists appointments_delete on public.appointments;
drop policy if exists appointments_admin_all on public.appointments;
create policy appointments_select on public.appointments for select using (user_id = auth.uid() and public.is_active_account());
create policy appointments_insert on public.appointments for insert with check (user_id = auth.uid() and public.is_active_account());
create policy appointments_update on public.appointments for update using (user_id = auth.uid() and public.is_active_account()) with check (user_id = auth.uid() and public.is_active_account());
create policy appointments_delete on public.appointments for delete using (user_id = auth.uid() and public.is_active_account());
create policy appointments_admin_all on public.appointments for all using (public.is_admin()) with check (public.is_admin());

-- appointment_services
drop policy if exists appt_services_select on public.appointment_services;
drop policy if exists appt_services_insert on public.appointment_services;
drop policy if exists appt_services_update on public.appointment_services;
drop policy if exists appt_services_delete on public.appointment_services;
drop policy if exists appt_services_admin_all on public.appointment_services;
create policy appt_services_select on public.appointment_services for select using (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_services_insert on public.appointment_services for insert with check (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_services_update on public.appointment_services for update using (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_services_delete on public.appointment_services for delete using (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_services_admin_all on public.appointment_services for all using (public.is_admin()) with check (public.is_admin());

-- appointment_products
drop policy if exists appt_products_select on public.appointment_products;
drop policy if exists appt_products_insert on public.appointment_products;
drop policy if exists appt_products_update on public.appointment_products;
drop policy if exists appt_products_delete on public.appointment_products;
drop policy if exists appt_products_admin_all on public.appointment_products;
create policy appt_products_select on public.appointment_products for select using (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_products_insert on public.appointment_products for insert with check (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_products_update on public.appointment_products for update using (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_products_delete on public.appointment_products for delete using (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid()) and public.is_active_account()
);
create policy appt_products_admin_all on public.appointment_products for all using (public.is_admin()) with check (public.is_admin());

-- profiles: admin enxerga todas as contas (a própria continua liberada pelas policies antigas).
drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles for select using (public.is_admin());

-- =============================================================================
-- RPCs de administração de contas
-- =============================================================================

create or replace function public.fn_admin_list_accounts()
returns table (
  id uuid,
  email text,
  name text,
  business_name text,
  role text,
  account_status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- checagem inline (com alias) em vez de public.is_admin(): as colunas de retorno desta
  -- função se chamam "id"/"role", e um "where id = ... and role = ..." sem alias fica
  -- ambíguo entre a coluna de profiles e o nome de retorno (erro 42702).
  if not exists (
    select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin'
  ) then
    raise exception 'Acesso negado';
  end if;
  return query
    select p.id, u.email::text, p.name, p.business_name, p.role, p.account_status, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

grant execute on function public.fn_admin_list_accounts() to authenticated;

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
end;
$$;

grant execute on function public.fn_admin_set_account_status(uuid, text) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 005
-- =============================================================================
