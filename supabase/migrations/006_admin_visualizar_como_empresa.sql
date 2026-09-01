-- =============================================================================
-- Migração 006 — Administrador consegue "entrar" em qualquer empresa (conta) e
-- ver/editar os dados dela como se fosse o dono. Adiciona um parâmetro opcional
-- `p_target_user_id` nas funções que criam/editam atendimentos e geram
-- relatórios: só tem efeito quando quem chama é administrador; para todo mundo
-- normal (barbeiro comum), sem esse parâmetro, continua funcionando como antes.
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
-- Seguro rodar mais de uma vez.
-- =============================================================================

create or replace function public.fn_create_appointment(
  p_client_id uuid,
  p_client_name text,
  p_notes text,
  p_date date,
  p_time time,
  p_payment_method_id uuid,
  p_services jsonb,
  p_products jsonb,
  p_target_user_id uuid default null
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
  if coalesce(jsonb_array_length(p_services), 0) = 0 then
    raise exception 'Informe pelo menos um serviço';
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

grant execute on function public.fn_create_appointment(uuid, text, text, date, time, uuid, jsonb, jsonb, uuid) to authenticated;

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
  p_target_user_id uuid default null
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_user uuid;
  item jsonb;
  v_keep_services uuid[];
  v_keep_products uuid[];
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

  if not exists (select 1 from public.appointments where id = p_appointment_id and user_id = v_user) then
    raise exception 'Atendimento não encontrado';
  end if;
  if coalesce(jsonb_array_length(p_services), 0) = 0 then
    raise exception 'Informe pelo menos um serviço';
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

grant execute on function public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb, uuid) to authenticated;

create or replace function public.fn_report_summary(p_start date, p_end date, p_target_user_id uuid default null)
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

grant execute on function public.fn_report_summary(date, date, uuid) to authenticated;

create or replace function public.fn_set_default_payment_method(p_id uuid, p_target_user_id uuid default null)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_user uuid;
begin
  if p_target_user_id is not null then
    if not public.is_admin() then
      raise exception 'Acesso negado';
    end if;
    v_user := p_target_user_id;
  else
    v_user := auth.uid();
  end if;

  if not exists (select 1 from public.payment_methods where id = p_id and user_id = v_user) then
    raise exception 'Forma de pagamento inválida';
  end if;
  update public.payment_methods set is_default = false where user_id = v_user and is_default;
  update public.payment_methods set is_default = true where id = p_id;
end;
$$;

grant execute on function public.fn_set_default_payment_method(uuid, uuid) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 006
-- =============================================================================
