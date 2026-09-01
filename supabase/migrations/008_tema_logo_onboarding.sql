  -- =============================================================================
  -- Migração 008 — Tema pessoal (escuro/claro/alto contraste), logo customizável
  -- da barbearia, e onboarding do usuário novo (nome + logo, aparece uma vez só).
  -- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
  -- Seguro rodar mais de uma vez.
  -- =============================================================================

  alter table public.profiles add column if not exists theme text not null default 'dark' check (theme in ('dark', 'light', 'a11y'));
  alter table public.profiles add column if not exists logo_url text;
  -- Contas já existentes ficam com onboarding_completed = true (nunca viram a tela);
  -- só as novas, criadas a partir de agora, começam com false (ver handle_new_user abaixo).
  alter table public.profiles add column if not exists onboarding_completed boolean not null default true;

  create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    insert into public.profiles (id, name, account_status, onboarding_completed)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'pending', false)
    on conflict (id) do nothing;
    return new;
  end;
  $$;

  -- =============================================================================
  -- Storage: bucket público para logos das barbearias (arquivo pequeno, leitura
  -- pública é necessária pra exibir no menu/relatórios sem autenticação extra).
  -- Caminho esperado de cada arquivo: "<user_id>/logo.<extensão>".
  -- =============================================================================

  insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict (id) do nothing;

  drop policy if exists logos_public_read on storage.objects;
  create policy logos_public_read on storage.objects for select using (bucket_id = 'logos');

  drop policy if exists logos_owner_write on storage.objects;
  create policy logos_owner_write on storage.objects for insert with check (
    bucket_id = 'logos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

  drop policy if exists logos_owner_update on storage.objects;
  create policy logos_owner_update on storage.objects for update using (
    bucket_id = 'logos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

  drop policy if exists logos_owner_delete on storage.objects;
  create policy logos_owner_delete on storage.objects for delete using (
    bucket_id = 'logos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

  -- =============================================================================
  -- FIM DA MIGRAÇÃO 008
  -- =============================================================================
