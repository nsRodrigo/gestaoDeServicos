-- =============================================================================
-- Migração 004 — Nome da barbearia customizável
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, depois dos anteriores.
-- Seguro rodar mais de uma vez.
-- =============================================================================

alter table public.profiles add column if not exists business_name text;

-- =============================================================================
-- FIM DA MIGRAÇÃO 004
-- =============================================================================
