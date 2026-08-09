/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BEEPER_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
