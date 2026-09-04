/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Injetado em build time (vite.config.ts `define`) a partir da versão no package.json. */
declare const __APP_VERSION__: string
