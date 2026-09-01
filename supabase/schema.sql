-- =============================================================================
-- Barbearia — Schema Supabase (Postgres)
-- Instalação nova: rode este arquivo inteiro no SQL Editor do Supabase e, em
-- seguida, cada arquivo em supabase/migrations/ na ordem numérica (ex: 002_...sql).
-- Projeto já em produção: se você já rodou este arquivo antes, NÃO rode de novo —
-- só rode os arquivos novos em supabase/migrations/ que ainda não rodou.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- TABELAS
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_services_user on public.services(user_id, status);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  stock_control boolean not null default false,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_user on public.products(user_id, status);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text,
  notes text,
  appointment_date date not null default current_date,
  appointment_time time not null default current_time,
  total_services numeric(10,2) not null default 0,
  total_products numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_appointments_user_date on public.appointments(user_id, appointment_date desc, appointment_time desc);

create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  service_price_snapshot numeric(10,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  subtotal numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_appt_services_appt on public.appointment_services(appointment_id);

create table if not exists public.appointment_products (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  product_price_snapshot numeric(10,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  subtotal numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_appt_products_appt on public.appointment_products(appointment_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_products enable row level security;

create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy services_select on public.services for select using (user_id = auth.uid());
create policy services_insert on public.services for insert with check (user_id = auth.uid());
create policy services_update on public.services for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy services_delete on public.services for delete using (user_id = auth.uid());

create policy products_select on public.products for select using (user_id = auth.uid());
create policy products_insert on public.products for insert with check (user_id = auth.uid());
create policy products_update on public.products for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy products_delete on public.products for delete using (user_id = auth.uid());

create policy appointments_select on public.appointments for select using (user_id = auth.uid());
create policy appointments_insert on public.appointments for insert with check (user_id = auth.uid());
create policy appointments_update on public.appointments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy appointments_delete on public.appointments for delete using (user_id = auth.uid());

create policy appt_services_select on public.appointment_services for select using (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid())
);
create policy appt_services_insert on public.appointment_services for insert with check (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid())
);
create policy appt_services_update on public.appointment_services for update using (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid())
);
create policy appt_services_delete on public.appointment_services for delete using (
  exists (select 1 from public.appointments a where a.id = appointment_services.appointment_id and a.user_id = auth.uid())
);

create policy appt_products_select on public.appointment_products for select using (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid())
);
create policy appt_products_insert on public.appointment_products for insert with check (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid())
);
create policy appt_products_update on public.appointment_products for update using (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid())
);
create policy appt_products_delete on public.appointment_products for delete using (
  exists (select 1 from public.appointments a where a.id = appointment_products.appointment_id and a.user_id = auth.uid())
);

-- =============================================================================
-- FUNÇÕES DE APOIO
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile quando um novo usuário se cadastra no Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que o total de um atendimento seja alterado diretamente pelo cliente:
-- só a função de recálculo (via set_config('app.recalculating', ...)) pode escrevê-lo.
create or replace function public.guard_appointment_totals()
returns trigger language plpgsql as $$
begin
  if current_setting('app.recalculating', true) is distinct from 'true' then
    new.total_services := old.total_services;
    new.total_products := old.total_products;
    new.total_amount := old.total_amount;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger appointments_guard_totals before update on public.appointments
  for each row execute function public.guard_appointment_totals();

-- Recalcula os totais do atendimento a partir da soma dos itens (serviços + extras).
create or replace function public.trg_recalc_appointment_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment_id uuid := coalesce(new.appointment_id, old.appointment_id);
  v_services_total numeric(10,2);
  v_products_total numeric(10,2);
begin
  select coalesce(sum(subtotal), 0) into v_services_total from public.appointment_services where appointment_id = v_appointment_id;
  select coalesce(sum(subtotal), 0) into v_products_total from public.appointment_products where appointment_id = v_appointment_id;

  perform set_config('app.recalculating', 'true', true);
  update public.appointments
    set total_services = v_services_total,
        total_products = v_products_total,
        total_amount = v_services_total + v_products_total
    where id = v_appointment_id;

  return null;
end;
$$;

create trigger appt_services_recalc_totals
  after insert or update or delete on public.appointment_services
  for each row execute function public.trg_recalc_appointment_totals();
create trigger appt_products_recalc_totals
  after insert or update or delete on public.appointment_products
  for each row execute function public.trg_recalc_appointment_totals();

-- Preenche o snapshot de nome/preço do serviço no momento do atendimento (histórico imutável).
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
    new.service_name_snapshot := v_service.name;
    new.service_price_snapshot := v_service.price;
    new.subtotal := v_service.price * new.quantity;
    return new;
  elsif tg_op = 'UPDATE' then
    new.service_name_snapshot := old.service_name_snapshot;
    new.service_price_snapshot := old.service_price_snapshot;
    new.service_id := old.service_id;
    new.subtotal := old.service_price_snapshot * new.quantity;
    return new;
  end if;
  return new;
end;
$$;

create trigger appt_services_snapshot before insert or update on public.appointment_services
  for each row execute function public.trg_appointment_services_snapshot();

-- Preenche o snapshot de nome/preço do produto e controla o estoque (histórico imutável +
-- bloqueio de venda sem estoque suficiente).
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
    new.product_name_snapshot := v_product.name;
    new.product_price_snapshot := v_product.price;
    new.subtotal := v_product.price * new.quantity;
    if v_product.stock_control then
      if v_product.stock_quantity < new.quantity then
        raise exception 'Estoque insuficiente para "%": disponível %, solicitado %', v_product.name, v_product.stock_quantity, new.quantity;
      end if;
      update public.products set stock_quantity = stock_quantity - new.quantity where id = v_product.id;
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    new.product_name_snapshot := old.product_name_snapshot;
    new.product_price_snapshot := old.product_price_snapshot;
    new.product_id := old.product_id;
    new.subtotal := old.product_price_snapshot * new.quantity;
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

create trigger appt_products_stock before insert or update or delete on public.appointment_products
  for each row execute function public.trg_appointment_products_stock();

-- =============================================================================
-- CRIAÇÃO/EDIÇÃO DE ATENDIMENTO (RPC) — tudo em uma única transação, para nunca
-- deixar um atendimento "pela metade" se o estoque de um item for insuficiente.
-- =============================================================================

create or replace function public.fn_create_appointment(
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
  p_services jsonb,
  p_products jsonb
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_appointment_id uuid;
  item jsonb;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  if coalesce(jsonb_array_length(p_services), 0) = 0 then
    raise exception 'Informe pelo menos um serviço';
  end if;

  insert into public.appointments (user_id, client_name, notes, appointment_date, appointment_time)
  values (v_user, nullif(p_client_name, ''), nullif(p_notes, ''), p_date, p_time)
  returning id into v_appointment_id;

  for item in select * from jsonb_array_elements(p_services) loop
    insert into public.appointment_services (appointment_id, service_id, quantity)
    values (v_appointment_id, (item->>'service_id')::uuid, (item->>'quantity')::int);
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) loop
    insert into public.appointment_products (appointment_id, product_id, quantity)
    values (v_appointment_id, (item->>'product_id')::uuid, (item->>'quantity')::int);
  end loop;

  return v_appointment_id;
end;
$$;

grant execute on function public.fn_create_appointment(text, text, date, time, jsonb, jsonb) to authenticated;

-- p_services / p_products: [{ "line_id": uuid|null, "service_id"/"product_id": uuid, "quantity": int }]
-- line_id vem preenchido para itens que já existiam no atendimento (apenas a quantidade é
-- atualizada, preservando o snapshot histórico de nome/preço) e nulo para itens novos
-- (recebem um snapshot novo, com o preço vigente). Itens ausentes do array são removidos.
create or replace function public.fn_update_appointment(
  p_appointment_id uuid,
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
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

  update public.appointments
    set client_name = nullif(p_client_name, ''),
        notes = nullif(p_notes, ''),
        appointment_date = p_date,
        appointment_time = p_time
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
      update public.appointment_services set quantity = (item->>'quantity')::int
        where id = (item->>'line_id')::uuid and appointment_id = p_appointment_id;
    else
      insert into public.appointment_services (appointment_id, service_id, quantity)
      values (p_appointment_id, (item->>'service_id')::uuid, (item->>'quantity')::int);
    end if;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) loop
    if (item->>'line_id') is not null then
      update public.appointment_products set quantity = (item->>'quantity')::int
        where id = (item->>'line_id')::uuid and appointment_id = p_appointment_id;
    else
      insert into public.appointment_products (appointment_id, product_id, quantity)
      values (p_appointment_id, (item->>'product_id')::uuid, (item->>'quantity')::int);
    end if;
  end loop;
end;
$$;

grant execute on function public.fn_update_appointment(uuid, text, text, date, time, jsonb, jsonb) to authenticated;

-- =============================================================================
-- RELATÓRIOS (RPC) — agregação feita no banco para o dashboard e os relatórios
-- =============================================================================

create or replace function public.fn_report_summary(p_start date, p_end date)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result json;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;

  select json_build_object(
    'start_date', p_start,
    'end_date', p_end,
    'total_appointments', coalesce(a.cnt, 0),
    'total_services_qty', coalesce(s.qty, 0),
    'total_services_amount', coalesce(a.services_amount, 0),
    'total_products_amount', coalesce(a.products_amount, 0),
    'total_amount', coalesce(a.services_amount, 0) + coalesce(a.products_amount, 0),
    'average_ticket', case when coalesce(a.cnt, 0) = 0 then 0
      else round((coalesce(a.services_amount, 0) + coalesce(a.products_amount, 0)) / a.cnt, 2) end,
    'services', coalesce(svc.items, '[]'::json),
    'products', coalesce(prod.items, '[]'::json),
    'by_day', coalesce(day.items, '[]'::json)
  ) into v_result
  from (
    select count(*) cnt, sum(total_services) services_amount, sum(total_products) products_amount
    from public.appointments
    where user_id = v_user and appointment_date between p_start and p_end
  ) a
  left join (
    select sum(aps.quantity) qty
    from public.appointment_services aps
    join public.appointments ap on ap.id = aps.appointment_id
    where ap.user_id = v_user and ap.appointment_date between p_start and p_end
  ) s on true
  left join (
    select json_agg(row_to_json(t)) items from (
      select aps.service_id id, aps.service_name_snapshot name,
        sum(aps.quantity)::int quantity, sum(aps.subtotal) amount
      from public.appointment_services aps
      join public.appointments ap on ap.id = aps.appointment_id
      where ap.user_id = v_user and ap.appointment_date between p_start and p_end
      group by aps.service_id, aps.service_name_snapshot
      order by sum(aps.subtotal) desc
    ) t
  ) svc on true
  left join (
    select json_agg(row_to_json(t)) items from (
      select app.product_id id, app.product_name_snapshot name,
        sum(app.quantity)::int quantity, sum(app.subtotal) amount
      from public.appointment_products app
      join public.appointments ap on ap.id = app.appointment_id
      where ap.user_id = v_user and ap.appointment_date between p_start and p_end
      group by app.product_id, app.product_name_snapshot
      order by sum(app.subtotal) desc
    ) t
  ) prod on true
  left join (
    select json_agg(row_to_json(t) order by t.date) items from (
      select appointment_date date, count(*)::int appointments, sum(total_amount) amount
      from public.appointments
      where user_id = v_user and appointment_date between p_start and p_end
      group by appointment_date
    ) t
  ) day on true;

  return v_result;
end;
$$;

grant execute on function public.fn_report_summary(date, date) to authenticated;

-- =============================================================================
-- FIM
-- =============================================================================
