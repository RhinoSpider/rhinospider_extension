/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DFX_NETWORK: string
  readonly VITE_II_URL: string
  readonly VITE_ADMIN_CANISTER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
