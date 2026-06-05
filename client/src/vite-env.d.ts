/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SELLER_NAME: string
  readonly VITE_SELLER_NIP: string
  readonly VITE_SELLER_ADDRESS: string
  readonly VITE_SELLER_CITY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
