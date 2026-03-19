/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CUSTOMER_DATA_API_URL: string;
  readonly VITE_LOGIN_API_URL: string;
  readonly VITE_DEVICE_DATA_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
