-- =============================================================================
-- Migração 012 — Venda avulsa, estoque sempre editável, notificações de estoque
-- mínimo e filtro de tipo nos relatórios.
--
-- Hoje um "atendimento" exige pelo menos um serviço — não dá pra registrar quando
-- o cliente só compra um produto (água, creme etc). Esta migração acrescenta um
-- segundo tipo de lançamento, "venda", que reaproveita a mesma tabela `appointments`
-- e as mesmas triggers de estoque/snapshot, mas sem exigir serviço, sem ocupar
-- horário na agenda (sem checagem de conflito) e sem contar para a fidelidade do
-- cliente (que continua sendo só para atendimentos).
--
-- Também: cruza o estoque atual com o mínimo configurado a cada baixa e grava uma
-- notificação quando o mínimo é atingido (fase 1 — central in-app; push do
-- navegador fica para depois), e acrescenta um filtro de tipo em `fn_report_summary`
-- para separar "Atendimentos" de "Vendas" nos relatórios.
--
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois das migrações 010 e
-- 011 (que ainda não foram rodadas). Seguro rodar mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela de notificações (precisa existir antes da trigger de estoque abaixo,
--    que passa a inserir nela).
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'low_stock' check (type in ('low_stock')),
  title text not null,
  message text not null,
  product_id uuid references public.products(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, created_at desc) where read_at is null;
create index if not exists idx_notifications_appointment
  on public.notifications(appointment_id);

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_update on public.notifications;

create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Sem policy de insert/delete para `authenticated`: só a trigger (security definer)
-- abaixo insere notificações; usuários só leem e marcam como lida.

-- -----------------------------------------------------------------------------
-- 2. Coluna `type` em appointments + relaxar a exigência de duração > 0 (vendas
--    não ocupam horário, então gravam duration_minutes = 0).
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists type text not null default 'atendimento' check (type in ('atendimento', 'venda'));

create index if not exists idx_appointments_user_type_date
  on public.appointments(user_id, type, appointment_date);

alter table public.appointments drop constraint if exists appointments_duration_minutes_check;
alter table public.appointments
  add constraint appointments_duration_minutes_check check (type = 'venda' or duration_minutes > 0);

-- -----------------------------------------------------------------------------
-- 3. Trigger de baixa de estoque (appointment_products) — mesma lógica de hoje,
--    acrescida da checagem de "cruzamento do mínimo" pra gerar notificação.
--    Dispara igual para atendimento e venda (as duas só inserem em
--    appointment_products), sem caso especial por tipo.
-- -----------------------------------------------------------------------------
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
      if v_product.stock_quantity > v_product.minimum_stock
         and (v_product.stock_quantity - new.quantity) <= v_product.minimum_stock then
        insert into public.notifications (user_id, type, title, message, product_id, appointment_id)
        values (
          v_owner, 'low_stock', 'Estoque baixo',
          format('"%s" chegou a %s unidade(s) (mínimo: %s).', v_product.name, v_product.stock_quantity - new.quantity, v_product.minimum_stock),
          v_product.id, new.appointment_id
        );
      end if;
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
        if v_delta > 0 and v_product.stock_quantity > v_product.minimum_stock
           and (v_product.stock_quantity - v_delta) <= v_product.minimum_stock then
          select user_id into v_owner from public.appointments where id = new.appointment_id;
          insert into public.notifications (user_id, type, title, message, product_id, appointment_id)
          values (
            v_owner, 'low_stock', 'Estoque baixo',
            format('"%s" chegou a %s unidade(s) (mínimo: %s).', v_product.name, v_product.stock_quantity - v_delta, v_product.minimum_stock),
            v_product.id, new.appointment_id
          );
        end if;
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

-- -----------------------------------------------------------------------------
-- 4. fn_create_appointment — novo parâmetro p_type; para 'venda' pula a exigência
--    de serviço, a checagem de conflito de horário e a contagem de fidelidade;
--    para os dois tipos, lê de volta as notificações de estoque baixo geradas
--    pela trigger acima (mesmo padrão que `loyalty` já usa).
-- -----------------------------------------------------------------------------
drop function if exists public.fn_create_appointment(uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer);

create or replace function public.fn_create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
  p_payment_method_id uuid,
  p_services jsonb,
  p_products jsonb,
  p_target_user_id uuid default null,
  p_duration_minutes integer default 30,
  p_type text default 'atendimento'
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user uuid;
  v_appointment_id uuid;
  v_number integer;
  item jsonb;
  v_client public.clients%rowtype;
  v_visits integer;
  v_period_start date;
  v_period_end date;
  v_loyalty jsonb := 'null'::jsonb;
  v_low_stock jsonb := '[]'::jsonb;
  v_call_ts timestamptz := clock_timestamp();
  v_duration integer;
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

  if v_user is null then
    raise exception 'Não autenticado';
  end if;

  if p_type not in ('atendimento', 'venda') then
    raise exception 'Tipo de lançamento inválido';
  end if;

  if p_type = 'atendimento' then
    if coalesce(jsonb_array_length(p_services), 0) = 0 then
      raise exception 'Informe pelo menos um serviço';
    end if;
    if coalesce(p_duration_minutes, 0) <= 0 then
      raise exception 'Duração inválida';
    end if;
    v_duration := p_duration_minutes;
  else
    if coalesce(jsonb_array_length(p_products), 0) = 0 then
      raise exception 'Informe pelo menos um produto';
    end if;
    v_duration := 0;
  end if;

  if p_payment_method_id is null then
    raise exception 'Informe a forma de pagamento';
  end if;

  if p_client_id is not null then
    select * into v_client from public.clients where id = p_client_id and user_id = v_user;
    if not found then
      raise exception 'Cliente inválido';
    end if;
  end if;

  if not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user
  ) then
    raise exception 'Forma de pagamento inválida';
  end if;

  if p_type = 'atendimento' and exists (
    select 1 from public.appointments a
    where a.user_id = v_user
      and a.appointment_date = p_date
      and a.appointment_time < (p_time + make_interval(mins => v_duration))
      and (a.appointment_time + make_interval(mins => a.duration_minutes)) > p_time
  ) then
    raise exception 'Já existe um atendimento nesse horário.';
  end if;

  select coalesce(max(appointment_number), 0) + 1 into v_number
    from public.appointments where user_id = v_user;

  insert into public.appointments (
    user_id, client_id, client_name, notes, appointment_date, appointment_time,
    duration_minutes, appointment_number, payment_method_id, type
  )
  values (
    v_user, p_client_id, nullif(p_client_name, ''), nullif(p_notes, ''),
    p_date, p_time, v_duration, v_number, p_payment_method_id, p_type
  )
  returning id into v_appointment_id;

  for item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    insert into public.appointment_services (appointment_id, service_id, quantity, custom_price)
    values (v_appointment_id, (item->>'service_id')::uuid, (item->>'quantity')::int, (item->>'custom_price')::numeric);
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) loop
    insert into public.appointment_products (appointment_id, product_id, quantity, custom_price)
    values (v_appointment_id, (item->>'product_id')::uuid, (item->>'quantity')::int, (item->>'custom_price')::numeric);
  end loop;

  if p_type = 'atendimento' and p_client_id is not null and v_client.loyalty_enabled and v_client.loyalty_period is not null
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
        and type = 'atendimento'
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

  select coalesce(jsonb_agg(jsonb_build_object('product_id', n.product_id, 'title', n.title, 'message', n.message)), '[]'::jsonb)
    into v_low_stock
    from public.notifications n
    where n.appointment_id = v_appointment_id and n.type = 'low_stock' and n.created_at >= v_call_ts;

  return jsonb_build_object('id', v_appointment_id, 'appointment_number', v_number, 'loyalty', v_loyalty, 'low_stock', v_low_stock);
end;
$$;

grant execute on function public.fn_create_appointment(uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. fn_update_appointment — sem novo parâmetro (tipo é imutável após criado); lê
--    o `type` da própria linha para decidir validação/conflito, e passa a
--    retornar jsonb com `low_stock` (antes retornava void).
-- -----------------------------------------------------------------------------
drop function if exists public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer);

create or replace function public.fn_update_appointment(
  p_appointment_id uuid,
  p_client_id uuid,
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
  p_payment_method_id uuid,
  p_services jsonb,
  p_products jsonb,
  p_target_user_id uuid default null,
  p_duration_minutes integer default 30
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_user uuid;
  item jsonb;
  v_keep_services uuid[];
  v_keep_products uuid[];
  v_type text;
  v_duration integer;
  v_low_stock jsonb := '[]'::jsonb;
  v_call_ts timestamptz := clock_timestamp();
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

  select type into v_type from public.appointments where id = p_appointment_id and user_id = v_user;
  if not found then
    raise exception 'Atendimento não encontrado';
  end if;

  if v_type = 'atendimento' then
    if coalesce(jsonb_array_length(p_services), 0) = 0 then
      raise exception 'Informe pelo menos um serviço';
    end if;
    if coalesce(p_duration_minutes, 0) <= 0 then
      raise exception 'Duração inválida';
    end if;
    v_duration := p_duration_minutes;
  else
    if coalesce(jsonb_array_length(p_products), 0) = 0 then
      raise exception 'Informe pelo menos um produto';
    end if;
    v_duration := 0;
  end if;

  if p_payment_method_id is null then
    raise exception 'Informe a forma de pagamento';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.clients where id = p_client_id and user_id = v_user
  ) then
    raise exception 'Cliente inválido';
  end if;
  if not exists (
    select 1 from public.payment_methods where id = p_payment_method_id and user_id = v_user
  ) then
    raise exception 'Forma de pagamento inválida';
  end if;

  if v_type = 'atendimento' and exists (
    select 1 from public.appointments a
    where a.user_id = v_user
      and a.id <> p_appointment_id
      and a.appointment_date = p_date
      and a.appointment_time < (p_time + make_interval(mins => v_duration))
      and (a.appointment_time + make_interval(mins => a.duration_minutes)) > p_time
  ) then
    raise exception 'Já existe um atendimento nesse horário.';
  end if;

  update public.appointments
    set client_id = p_client_id,
        client_name = nullif(p_client_name, ''),
        notes = nullif(p_notes, ''),
        appointment_date = p_date,
        appointment_time = p_time,
        duration_minutes = v_duration,
        payment_method_id = p_payment_method_id
    where id = p_appointment_id;

  select coalesce(array_agg((item->>'line_id')::uuid), '{}')
    into v_keep_services
    from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) item
    where (item->>'line_id') is not null;

  select coalesce(array_agg((item->>'line_id')::uuid), '{}')
    into v_keep_products
    from jsonb_array_elements(coalesce(p_products, '[]'::jsonb)) item
    where (item->>'line_id') is not null;

  delete from public.appointment_services
    where appointment_id = p_appointment_id and not (id = any(v_keep_services));
  delete from public.appointment_products
    where appointment_id = p_appointment_id and not (id = any(v_keep_products));

  for item in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
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

  select coalesce(jsonb_agg(jsonb_build_object('product_id', n.product_id, 'title', n.title, 'message', n.message)), '[]'::jsonb)
    into v_low_stock
    from public.notifications n
    where n.appointment_id = p_appointment_id and n.type = 'low_stock' and n.created_at >= v_call_ts;

  return jsonb_build_object('low_stock', v_low_stock);
end;
$$;

grant execute on function public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. fn_report_summary — novo filtro opcional p_type ('atendimento' | 'venda' |
--    null = todos). Mantém `returns json`/`json_build_object` como já era (não é
--    jsonb), só acrescenta o predicado de tipo nas 4 subconsultas.
-- -----------------------------------------------------------------------------
drop function if exists public.fn_report_summary(date, date, uuid);

create or replace function public.fn_report_summary(
  p_start date,
  p_end date,
  p_target_user_id uuid default null,
  p_type text default null
)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user uuid;
  v_result json;
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

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
      and (p_type is null or type = p_type)
  ) a
  left join (
    select sum(aps.quantity) qty
    from public.appointment_services aps
    join public.appointments ap on ap.id = aps.appointment_id
    where ap.user_id = v_user and ap.appointment_date between p_start and p_end
      and (p_type is null or ap.type = p_type)
  ) s on true
  left join (
    select json_agg(row_to_json(t)) items from (
      select aps.service_id id, aps.service_name_snapshot name,
        sum(aps.quantity)::int quantity, sum(aps.subtotal) amount
      from public.appointment_services aps
      join public.appointments ap on ap.id = aps.appointment_id
      where ap.user_id = v_user and ap.appointment_date between p_start and p_end
        and (p_type is null or ap.type = p_type)
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
        and (p_type is null or ap.type = p_type)
      group by app.product_id, app.product_name_snapshot
      order by sum(app.subtotal) desc
    ) t
  ) prod on true
  left join (
    select json_agg(row_to_json(t) order by t.date) items from (
      select appointment_date date, count(*)::int appointments, sum(total_amount) amount
      from public.appointments
      where user_id = v_user and appointment_date between p_start and p_end
        and (p_type is null or type = p_type)
      group by appointment_date
    ) t
  ) day on true;

  return v_result;
end;
$$;

grant execute on function public.fn_report_summary(date, date, uuid, text) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 012
-- =============================================================================
