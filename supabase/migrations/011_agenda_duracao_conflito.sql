-- =============================================================================
-- Migração 011 — Agenda: duração do atendimento + bloqueio de conflito de horário.
-- Hoje um atendimento só tem data+hora, sem duração, então nada impede marcar dois
-- atendimentos no mesmo horário. Esta migração adiciona "quanto tempo dura" e passa a
-- recusar criar/editar um atendimento que sobreponha outro do mesmo usuário no mesmo dia.
-- Não mexe em forma de pagamento/serviços obrigatórios nem em múltiplos profissionais —
-- continua um profissional (usuário) por conta, exatamente como hoje.
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
-- Seguro rodar mais de uma vez.
-- =============================================================================

alter table public.appointments
  add column if not exists duration_minutes integer not null default 30 check (duration_minutes > 0);

-- Sem constraint de exclusão no banco (tipo EXCLUDE USING gist) de propósito: não queremos
-- arriscar a migração falhar caso já existam atendimentos históricos "sobrepostos" (nenhum
-- tinha duração até agora). A checagem abaixo só vale para inserções/edições novas a partir daqui.

-- create or replace function só troca a implementação de uma função já existente se a lista de
-- parâmetros for idêntica (mesmo tipo, mesma quantidade) — como estamos ACRESCENTANDO um
-- parâmetro nas duas funções abaixo, precisamos derrubar a versão antiga antes, senão ficamos
-- com duas versões (a antiga, sem duração, junto da nova) — mesmo cuidado que a migração 002 já
-- teve com essas mesmas funções.
drop function if exists public.fn_create_appointment(uuid, text, text, date, time, uuid, jsonb, jsonb, uuid);
drop function if exists public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb, uuid);

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
  p_duration_minutes integer default 30
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
  if coalesce(p_duration_minutes, 0) <= 0 then
    raise exception 'Duração inválida';
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

  if exists (
    select 1 from public.appointments a
    where a.user_id = v_user
      and a.appointment_date = p_date
      and a.appointment_time < (p_time + make_interval(mins => p_duration_minutes))
      and (a.appointment_time + make_interval(mins => a.duration_minutes)) > p_time
  ) then
    raise exception 'Já existe um atendimento nesse horário.';
  end if;

  select coalesce(max(appointment_number), 0) + 1 into v_number
    from public.appointments where user_id = v_user;

  insert into public.appointments (
    user_id, client_id, client_name, notes, appointment_date, appointment_time,
    duration_minutes, appointment_number, payment_method_id
  )
  values (
    v_user, p_client_id, nullif(p_client_name, ''), nullif(p_notes, ''),
    p_date, p_time, p_duration_minutes, v_number, p_payment_method_id
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

grant execute on function public.fn_create_appointment(uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer) to authenticated;

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
  if coalesce(p_duration_minutes, 0) <= 0 then
    raise exception 'Duração inválida';
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

  if exists (
    select 1 from public.appointments a
    where a.user_id = v_user
      and a.id <> p_appointment_id
      and a.appointment_date = p_date
      and a.appointment_time < (p_time + make_interval(mins => p_duration_minutes))
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
        duration_minutes = p_duration_minutes,
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

grant execute on function public.fn_update_appointment(uuid, uuid, text, text, date, time, uuid, jsonb, jsonb, uuid, integer) to authenticated;

-- =============================================================================
-- FIM DA MIGRAÇÃO 011
-- =============================================================================
