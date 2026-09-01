-- =============================================================================
-- Migração 002 — Clientes, fidelidade, preço personalizado, formas de pagamento
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois de já ter rodado o
-- supabase/schema.sql original. Seguro rodar mais de uma vez (idempotente).
-- =============================================================================

-- =============================================================================
-- TABELAS NOVAS
-- =============================================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  loyalty_enabled boolean not null default false,
  loyalty_period text check (loyalty_period in ('monthly', 'quarterly', 'semiannual', 'annual')),
  loyalty_visits_required integer check (loyalty_visits_required > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_clients_user on public.clients(user_id, status);

alter table public.clients enable row level security;

drop policy if exists clients_select on public.clients;
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;
create policy clients_select on public.clients for select using (user_id = auth.uid());
create policy clients_insert on public.clients for insert with check (user_id = auth.uid());
create policy clients_update on public.clients for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy clients_delete on public.clients for delete using (user_id = auth.uid());

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payment_methods_user on public.payment_methods(user_id, status);

alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_select on public.payment_methods;
drop policy if exists payment_methods_insert on public.payment_methods;
drop policy if exists payment_methods_update on public.payment_methods;
drop policy if exists payment_methods_delete on public.payment_methods;
create policy payment_methods_select on public.payment_methods for select using (user_id = auth.uid());
create policy payment_methods_insert on public.payment_methods for insert with check (user_id = auth.uid());
create policy payment_methods_update on public.payment_methods for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy payment_methods_delete on public.payment_methods for delete using (user_id = auth.uid());

drop trigger if exists payment_methods_set_updated_at on public.payment_methods;
create trigger payment_methods_set_updated_at before update on public.payment_methods
  for each row execute function public.set_updated_at();

-- =============================================================================
-- COLUNAS NOVAS EM TABELAS EXISTENTES
-- =============================================================================

alter table public.appointments add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.appointments add column if not exists appointment_number integer;
alter table public.appointments add column if not exists payment_method_id uuid references public.payment_methods(id) on delete set null;
alter table public.appointments add column if not exists payment_method_name_snapshot text;

-- Preenche appointment_number para atendimentos que já existiam antes desta migração.
with numbered as (
  select id, row_number() over (partition by user_id order by created_at) as rn
  from public.appointments
  where appointment_number is null
)
update public.appointments a
  set appointment_number = numbered.rn
  from numbered
  where a.id = numbered.id;

alter table public.appointments alter column appointment_number set not null;
create unique index if not exists idx_appointments_user_number on public.appointments(user_id, appointment_number);
create index if not exists idx_appointments_client on public.appointments(client_id);

alter table public.appointment_services add column if not exists custom_price numeric(10,2);
alter table public.appointment_products add column if not exists custom_price numeric(10,2);

-- =============================================================================
-- SNAPSHOT DA FORMA DE PAGAMENTO (histórico imutável, igual a serviços/produtos)
-- =============================================================================

create or replace function public.trg_appointment_payment_method_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.payment_method_id is null then
    new.payment_method_name_snapshot := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.payment_method_id = old.payment_method_id then
    return new;
  end if;

  select name into v_name from public.payment_methods
    where id = new.payment_method_id and user_id = new.user_id;
  if v_name is null then
    raise exception 'Forma de pagamento inválida';
  end if;
  new.payment_method_name_snapshot := v_name;
  return new;
end;
$$;

drop trigger if exists appointments_payment_method_snapshot on public.appointments;
create trigger appointments_payment_method_snapshot before insert or update on public.appointments
  for each row execute function public.trg_appointment_payment_method_snapshot();

-- =============================================================================
-- SNAPSHOT DE PREÇO — agora aceitando preço personalizado por atendimento
-- =============================================================================

create or replace function public.trg_appointment_services_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service public.services%rowtype;
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    select * into v_service from public.services where id = new.service_id;
    if not found then
      raise exception 'Serviço não encontrado';
    end if;
    select user_id into v_owner from public.appointments where id = new.appointment_id;
    if v_service.user_id <> v_owner then
      raise exception 'Serviço inválido para este atendimento';
    end if;
    if new.custom_price is not null and new.custom_price < 0 then
      raise exception 'Valor personalizado inválido';
    end if;
    new.service_name_snapshot := v_service.name;
    new.service_price_snapshot := coalesce(new.custom_price, v_service.price);
    new.subtotal := new.service_price_snapshot * new.quantity;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.custom_price is not null and new.custom_price < 0 then
      raise exception 'Valor personalizado inválido';
    end if;
    new.service_name_snapshot := old.service_name_snapshot;
    new.service_id := old.service_id;
    new.service_price_snapshot := coalesce(new.custom_price, old.service_price_snapshot);
    new.subtotal := new.service_price_snapshot * new.quantity;
    return new;
  end if;
  return new;
end;
$$;

create or replace function public.trg_appointment_products_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_owner uuid;
  v_delta integer;
begin
  if tg_op = 'INSERT' then
    select * into v_product from public.products where id = new.product_id for update;
    if not found then
      raise exception 'Produto não encontrado';
    end if;
    select user_id into v_owner from public.appointments where id = new.appointment_id;
    if v_product.user_id <> v_owner then
      raise exception 'Produto inválido para este atendimento';
    end if;
    if new.custom_price is not null and new.custom_price < 0 then
      raise exception 'Valor personalizado inválido';
    end if;
    new.product_name_snapshot := v_product.name;
    new.product_price_snapshot := coalesce(new.custom_price, v_product.price);
    new.subtotal := new.product_price_snapshot * new.quantity;
    if v_product.stock_control then
      if v_product.stock_quantity < new.quantity then
        raise exception 'Estoque insuficiente para "%": disponível %, solicitado %', v_product.name, v_product.stock_quantity, new.quantity;
      end if;
      update public.products set stock_quantity = stock_quantity - new.quantity where id = v_product.id;
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    if new.custom_price is not null and new.custom_price < 0 then
      raise exception 'Valor personalizado inválido';
    end if;
    new.product_name_snapshot := old.product_name_snapshot;
    new.product_id := old.product_id;
    new.product_price_snapshot := coalesce(new.custom_price, old.product_price_snapshot);
    new.subtotal := new.product_price_snapshot * new.quantity;
    v_delta := new.quantity - old.quantity;
    if v_delta <> 0 then
      select * into v_product from public.products where id = old.product_id for update;
      if found and v_product.stock_control then
        if v_delta > 0 and v_product.stock_quantity < v_delta then
          raise exception 'Estoque insuficiente para "%": disponível %, solicitado %', v_product.name, v_product.stock_quantity, v_delta;
        end if;
        update public.products set stock_quantity = stock_quantity - v_delta where id = v_product.id;
      end if;
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    select * into v_product from public.products where id = old.product_id for update;
    if found and v_product.stock_control then
      update public.products set stock_quantity = stock_quantity + old.quantity where id = v_product.id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

-- =============================================================================
-- CRIAÇÃO/EDIÇÃO DE ATENDIMENTO — agora com cliente, forma de pagamento, preço
-- personalizado por item e verificação de fidelidade.
-- =============================================================================

drop function if exists public.fn_create_appointment(text, text, date, time, jsonb, jsonb);

-- p_services / p_products: [{ "service_id"/"product_id": uuid, "quantity": int, "custom_price": numeric|null }]
create or replace function public.fn_create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
  p_payment_method_id uuid,
  p_services jsonb,
  p_products jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_appointment_id uuid;
  v_number integer;
  item jsonb;
  v_client public.clients%rowtype;
  v_visits integer;
  v_period_start date;
  v_period_end date;
  v_loyalty jsonb := 'null'::jsonb;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  if coalesce(jsonb_array_length(p_services), 0) = 0 then
    raise exception 'Informe pelo menos um serviço';
  end if;

  if p_client_id is not null then
    select * into v_client from public.clients where id = p_client_id and user_id = v_user;
    if not found then
      raise exception 'Cliente inválido';
    end if;
  end if;

  if p_payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user
  ) then
    raise exception 'Forma de pagamento inválida';
  end if;

  select coalesce(max(appointment_number), 0) + 1 into v_number
    from public.appointments where user_id = v_user;

  insert into public.appointments (
    user_id, client_id, client_name, notes, appointment_date, appointment_time,
    appointment_number, payment_method_id
  )
  values (
    v_user, p_client_id, nullif(p_client_name, ''), nullif(p_notes, ''),
    p_date, p_time, v_number, p_payment_method_id
  )
  returning id into v_appointment_id;

  for item in select * from jsonb_array_elements(p_services) loop
    insert into public.appointment_services (appointment_id, service_id, quantity, custom_price)
    values (v_appointment_id, (item->>'service_id')::uuid, (item->>'quantity')::int, (item->>'custom_price')::numeric);
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) loop
    insert into public.appointment_products (appointment_id, product_id, quantity, custom_price)
    values (v_appointment_id, (item->>'product_id')::uuid, (item->>'quantity')::int, (item->>'custom_price')::numeric);
  end loop;

  if p_client_id is not null and v_client.loyalty_enabled and v_client.loyalty_period is not null
     and v_client.loyalty_visits_required is not null then
    case v_client.loyalty_period
      when 'monthly' then
        v_period_start := date_trunc('month', p_date)::date;
        v_period_end := (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date;
      when 'quarterly' then
        v_period_start := date_trunc('quarter', p_date)::date;
        v_period_end := (date_trunc('quarter', p_date) + interval '3 months' - interval '1 day')::date;
      when 'semiannual' then
        if extract(month from p_date) <= 6 then
          v_period_start := make_date(extract(year from p_date)::int, 1, 1);
          v_period_end := make_date(extract(year from p_date)::int, 6, 30);
        else
          v_period_start := make_date(extract(year from p_date)::int, 7, 1);
          v_period_end := make_date(extract(year from p_date)::int, 12, 31);
        end if;
      when 'annual' then
        v_period_start := date_trunc('year', p_date)::date;
        v_period_end := (date_trunc('year', p_date) + interval '1 year' - interval '1 day')::date;
    end case;

    select count(*) into v_visits
      from public.appointments
      where client_id = p_client_id and user_id = v_user
        and appointment_date between v_period_start and v_period_end;

    if v_visits = v_client.loyalty_visits_required then
      v_loyalty := jsonb_build_object(
        'client_name', v_client.name,
        'visits', v_visits,
        'required', v_client.loyalty_visits_required,
        'period', v_client.loyalty_period
      );
    end if;
  end if;

  return jsonb_build_object('id', v_appointment_id, 'appointment_number', v_number, 'loyalty', v_loyalty);
end;
$$;

grant execute on function public.fn_create_appointment(uuid, text, text, date, time, uuid, jsonb, jsonb) to authenticated;

drop function if exists public.fn_update_appointment(uuid, text, text, date, time, jsonb, jsonb);

-- p_services / p_products: [{ "line_id": uuid|null, "service_id"/"product_id": uuid, "quantity": int, "custom_price": numeric|null }]
create or replace function public.fn_update_appointment(
  p_appointment_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
  p_payment_method_id uuid,
  p_services jsonb,
  p_products jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  item jsonb;
  v_keep_services uuid[];
  v_keep_products uuid[];
begin
  if not exists (select 1 from public.appointments where id = p_appointment_id and user_id = v_user) then
    raise exception 'Atendimento não encontrado';
  end if;
  if coalesce(jsonb_array_length(p_services), 0) = 0 then
    raise exception 'Informe pelo menos um serviço';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.clients where id = p_client_id and user_id = v_user
  ) then
    raise exception 'Cliente inválido';
  end if;
  if p_payment_method_id is not null and not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user
  ) then
    raise exception 'Forma de pagamento inválida';
  end if;

  update public.appointments
    set client_id = p_client_id,
        client_name = nullif(p_client_name, ''),
        notes = nullif(p_notes, ''),
        appointment_date = p_date,
        appointment_time = p_time,
        payment_method_id = p_payment_method_id
    where id = p_appointment_id;

  select coalesce(array_agg((item->>'line_id')::uuid), '{}')
    into v_keep_services
    from jsonb_array_elements(p_services) item
    where (item->>'line_id') is not null;

  select coalesce(array_agg((item->>'line_id')::uuid), '{}')
    into v_keep_products
    from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) item
    where (item->>'line_id') is not null;

  delete from public.appointment_services
    where appointment_id = p_appointment_id and not (id = any(v_keep_services));
  delete from public.appointment_products
    where appointment_id = p_appointment_id and not (id = any(v_keep_products));

  for item in select * from jsonb_array_elements(p_services) loop
    if (item->>'line_id') is not null then
      update public.appointment_services
        set quantity = (item->>'quantity')::int, custom_price = (item->>'custom_price')::numeric
        where id = (item->>'line_id')::uuid and appointment_id = p_appointment_id;
    else
      insert into public.appointment_services (appointment_id, service_id, quantity, custom_price)
      values (p_appointment_id, (item->>'service_id')::uuid, (item->>'quantity')::int, (item->>'custom_price')::numeric);
    end if;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) loop
    if (item->>'line_id') is not null then
      update public.appointment_products
        set quantity = (item->>'quantity')::int, custom_price = (item->>'custom_price')::numeric
        where id = (item->>'line_id')::uuid and appointment_id = p_appointment_id;
    else
      insert into public.appointment_products (appointment_id, product_id, quantity, custom_price)
      values (p_appointment_id, (item->>'product_id')::uuid, (item->>'quantity')::int, (item->>'custom_price')::numeric);
    end if;
  end loop;
end;
$$;

grant execute on function public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 002
-- =============================================================================
