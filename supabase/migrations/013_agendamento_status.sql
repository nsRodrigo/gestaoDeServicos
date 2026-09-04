-- =============================================================================
-- Migração 013 — Atendimento vira uma agenda de verdade: status agendado /
-- concluído / cancelado.
--
-- Até aqui, todo atendimento nascia como um fato já consumado — descontava
-- estoque, contava fidelidade e entrava no relatório na hora que era salvo,
-- mesmo com data futura. Esta migração corrige isso: se a data/hora escolhida
-- for no futuro, o atendimento nasce "agendado" (nada é descontado ainda); só
-- quando alguém marcar como concluído (podendo ajustar produtos extras
-- consumidos na hora) é que estoque/fidelidade/relatório passam a contar. Dá
-- pra cancelar (cliente desistiu, sem efeito financeiro) a qualquer momento
-- enquanto ainda estiver agendado. Venda continua sempre imediata — nada
-- disso se aplica a ela.
--
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois da migração 012.
-- Seguro rodar mais de uma vez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Coluna `status` em appointments. Default 'concluido' preserva o
--    comportamento de toda linha existente. Venda nunca pode ser outra coisa
--    além de 'concluido' — garantido por constraint, não só por convenção.
-- -----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists status text not null default 'concluido'
    check (status in ('agendado', 'concluido', 'cancelado'));

alter table public.appointments drop constraint if exists appointments_status_venda_check;
alter table public.appointments
  add constraint appointments_status_venda_check check (type = 'atendimento' or status = 'concluido');

create index if not exists idx_appointments_user_status_date
  on public.appointments(user_id, status, appointment_date);

-- -----------------------------------------------------------------------------
-- 2. Coluna `stock_deducted` em appointment_products — marca se aquela linha
--    já teve o estoque descontado. Default true faz o backfill correto de
--    todas as linhas existentes (todas já tinham sido descontadas, sob o
--    comportamento antigo "sempre imediato"). Toda linha NOVA a partir de
--    agora tem esse valor definido explicitamente pela trigger abaixo — o
--    default só importa pras linhas antigas.
-- -----------------------------------------------------------------------------
alter table public.appointment_products
  add column if not exists stock_deducted boolean not null default true;

-- -----------------------------------------------------------------------------
-- 3. Trigger de estoque — agora ciente do status do atendimento pai. Só
--    desconta/verifica estoque mínimo quando o atendimento está 'concluido'
--    (venda sempre está). Enquanto 'agendado', a linha fica com
--    stock_deducted = false e nada é tocado no estoque — nem no INSERT nem em
--    edições de quantidade (UPDATE) — até a conclusão (fn_update_appointment
--    com p_conclude=true, seção 5) fazer isso explicitamente. No DELETE, só
--    restaura estoque se `stock_deducted` era true — é o que impede excluir
--    um atendimento agendado (nunca descontado) de "devolver" estoque que
--    nunca saiu.
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
  v_status text;
  v_delta integer;
begin
  if tg_op = 'INSERT' then
    select * into v_product from public.products where id = new.product_id for update;
    if not found then
      raise exception 'Produto não encontrado';
    end if;
    select user_id, status into v_owner, v_status
      from public.appointments where id = new.appointment_id;
    if v_product.user_id <> v_owner then
      raise exception 'Produto inválido para este atendimento';
    end if;
    if new.custom_price is not null and new.custom_price < 0 then
      raise exception 'Valor personalizado inválido';
    end if;
    new.product_name_snapshot := v_product.name;
    new.product_price_snapshot := coalesce(new.custom_price, v_product.price);
    new.subtotal := new.product_price_snapshot * new.quantity;

    if v_status <> 'concluido' then
      new.stock_deducted := false;
      return new;
    end if;

    new.stock_deducted := true;
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

    select status into v_status from public.appointments where id = new.appointment_id;

    v_delta := new.quantity - old.quantity;
    if v_status = 'concluido' and old.stock_deducted and v_delta <> 0 then
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
    -- status = 'agendado', ou old.stock_deducted = false: nenhuma baixa aqui —
    -- a conclusão (fn_update_appointment com p_conclude=true) cuida disso.
    return new;

  elsif tg_op = 'DELETE' then
    if old.stock_deducted then
      select * into v_product from public.products where id = old.product_id for update;
      if found and v_product.stock_control then
        update public.products set stock_quantity = stock_quantity + old.quantity where id = v_product.id;
      end if;
    end if;
    return old;
  end if;
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. fn_loyalty_check — extrai o cálculo de período/contagem de visitas que
--    hoje vive dentro de fn_create_appointment, pra reusar também na
--    conclusão de um atendimento agendado. A contagem ganha `status =
--    'concluido'` (hoje não tinha nenhum filtro de status).
-- -----------------------------------------------------------------------------
create or replace function public.fn_loyalty_check(
  p_user uuid,
  p_client_id uuid,
  p_date date
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_visits integer;
  v_period_start date;
  v_period_end date;
begin
  select * into v_client from public.clients where id = p_client_id and user_id = p_user;
  if not found or not v_client.loyalty_enabled or v_client.loyalty_period is null
     or v_client.loyalty_visits_required is null then
    return null;
  end if;

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
    where client_id = p_client_id and user_id = p_user
      and type = 'atendimento'
      and status = 'concluido'
      and appointment_date between v_period_start and v_period_end;

  if v_visits = v_client.loyalty_visits_required then
    return jsonb_build_object(
      'client_name', v_client.name,
      'visits', v_visits,
      'required', v_client.loyalty_visits_required,
      'period', v_client.loyalty_period
    );
  end if;
  return null;
end;
$$;

grant execute on function public.fn_loyalty_check(uuid, uuid, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. fn_create_appointment — mesma assinatura de 12 parâmetros (sem precisar
--    de drop). Decide o status pela data/hora: futura vira 'agendado', senão
--    'concluido' (venda é sempre 'concluido'). Fidelidade só roda quando o
--    status nasce concluído. Conflito de horário ignora atendimentos
--    cancelados (um horário cancelado libera o slot).
-- -----------------------------------------------------------------------------
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
  v_loyalty jsonb := 'null'::jsonb;
  v_low_stock jsonb := '[]'::jsonb;
  v_call_ts timestamptz := clock_timestamp();
  v_duration integer;
  v_status text;
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
    v_status := case when (p_date + p_time) > now()::timestamp then 'agendado' else 'concluido' end;
  else
    if coalesce(jsonb_array_length(p_products), 0) = 0 then
      raise exception 'Informe pelo menos um produto';
    end if;
    v_duration := 0;
    v_status := 'concluido';
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
      and a.status <> 'cancelado'
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
    duration_minutes, appointment_number, payment_method_id, type, status
  )
  values (
    v_user, p_client_id, nullif(p_client_name, ''), nullif(p_notes, ''),
    p_date, p_time, v_duration, v_number, p_payment_method_id, p_type, v_status
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

  if p_type = 'atendimento' and v_status = 'concluido' and p_client_id is not null then
    v_loyalty := public.fn_loyalty_check(v_user, p_client_id, p_date);
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
-- 6. fn_update_appointment — ganha o 12º parâmetro p_conclude (muda
--    assinatura, precisa dropar a versão de 11 antes). Quando p_conclude =
--    true: exige que o atendimento esteja 'agendado', aplica as edições de
--    sempre, desconta estoque das linhas ainda não descontadas
--    (stock_deducted = false — inclui extras adicionados nesta mesma edição),
--    marca status = 'concluido' e roda a checagem de fidelidade.
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
  p_duration_minutes integer default 30,
  p_conclude boolean default false
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
  v_status text;
  v_duration integer;
  v_low_stock jsonb := '[]'::jsonb;
  v_loyalty jsonb := 'null'::jsonb;
  v_call_ts timestamptz := clock_timestamp();
  v_line record;
  v_product public.products%rowtype;
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

  select type, status into v_type, v_status
    from public.appointments where id = p_appointment_id and user_id = v_user;
  if not found then
    raise exception 'Atendimento não encontrado';
  end if;

  if p_conclude then
    if v_type <> 'atendimento' then
      raise exception 'Somente atendimentos podem ser concluídos.';
    end if;
    if v_status <> 'agendado' then
      raise exception 'Este atendimento já foi concluído ou cancelado.';
    end if;
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
      and a.status <> 'cancelado'
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

  -- Enquanto o status ainda for 'agendado' aqui (só vira 'concluido' mais
  -- abaixo, se p_conclude), a trigger não baixa estoque nenhum — inclusive um
  -- extra novo inserido agora nasce com stock_deducted = false, e é pego pelo
  -- laço de conclusão logo abaixo.
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

  if p_conclude then
    for v_line in
      select * from public.appointment_products
      where appointment_id = p_appointment_id and stock_deducted = false
      for update
    loop
      select * into v_product from public.products where id = v_line.product_id for update;
      if found and v_product.stock_control then
        if v_product.stock_quantity < v_line.quantity then
          raise exception 'Estoque insuficiente para "%": disponível %, solicitado %', v_product.name, v_product.stock_quantity, v_line.quantity;
        end if;
        update public.products set stock_quantity = stock_quantity - v_line.quantity where id = v_product.id;
        if v_product.stock_quantity > v_product.minimum_stock
           and (v_product.stock_quantity - v_line.quantity) <= v_product.minimum_stock then
          insert into public.notifications (user_id, type, title, message, product_id, appointment_id)
          values (
            v_user, 'low_stock', 'Estoque baixo',
            format('"%s" chegou a %s unidade(s) (mínimo: %s).', v_product.name, v_product.stock_quantity - v_line.quantity, v_product.minimum_stock),
            v_product.id, p_appointment_id
          );
        end if;
      end if;
      update public.appointment_products set stock_deducted = true where id = v_line.id;
    end loop;

    update public.appointments set status = 'concluido' where id = p_appointment_id;

    if p_client_id is not null then
      v_loyalty := public.fn_loyalty_check(v_user, p_client_id, p_date);
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('product_id', n.product_id, 'title', n.title, 'message', n.message)), '[]'::jsonb)
    into v_low_stock
    from public.notifications n
    where n.appointment_id = p_appointment_id and n.type = 'low_stock' and n.created_at >= v_call_ts;

  return jsonb_build_object('low_stock', v_low_stock, 'loyalty', v_loyalty);
end;
$$;

grant execute on function public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 7. fn_cancel_appointment — nova função. Só cancela quem ainda está
--    'agendado' (sem efeito em estoque/fidelidade, já que nada foi
--    descontado ainda).
-- -----------------------------------------------------------------------------
create or replace function public.fn_cancel_appointment(
  p_appointment_id uuid,
  p_target_user_id uuid default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_user uuid;
  v_type text;
  v_status text;
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

  select type, status into v_type, v_status
    from public.appointments where id = p_appointment_id and user_id = v_user;
  if not found then
    raise exception 'Atendimento não encontrado';
  end if;
  if v_type <> 'atendimento' then
    raise exception 'Somente atendimentos agendados podem ser cancelados.';
  end if;
  if v_status <> 'agendado' then
    raise exception 'Este atendimento não está mais agendado.';
  end if;

  update public.appointments set status = 'cancelado' where id = p_appointment_id;
end;
$$;

grant execute on function public.fn_cancel_appointment(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 8. fn_report_summary — acrescenta `status = 'concluido'` nas 4
--    subconsultas, além do filtro de tipo já existente (mesma assinatura,
--    sem precisar de drop; ainda `returns json`, não `jsonb`).
-- -----------------------------------------------------------------------------
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
      and status = 'concluido'
      and (p_type is null or type = p_type)
  ) a
  left join (
    select sum(aps.quantity) qty
    from public.appointment_services aps
    join public.appointments ap on ap.id = aps.appointment_id
    where ap.user_id = v_user and ap.appointment_date between p_start and p_end
      and ap.status = 'concluido'
      and (p_type is null or ap.type = p_type)
  ) s on true
  left join (
    select json_agg(row_to_json(t)) items from (
      select aps.service_id id, aps.service_name_snapshot name,
        sum(aps.quantity)::int quantity, sum(aps.subtotal) amount
      from public.appointment_services aps
      join public.appointments ap on ap.id = aps.appointment_id
      where ap.user_id = v_user and ap.appointment_date between p_start and p_end
        and ap.status = 'concluido'
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
        and ap.status = 'concluido'
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
        and status = 'concluido'
        and (p_type is null or type = p_type)
      group by appointment_date
    ) t
  ) day on true;

  return v_result;
end;
$$;

grant execute on function public.fn_report_summary(date, date, uuid, text) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 013
-- =============================================================================
