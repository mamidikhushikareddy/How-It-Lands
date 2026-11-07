/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA4_MEASUREMENT_ID?: string;
  readonly VITE_GTM_CONTAINER_ID?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_AMPLITUDE_API_KEY?: string;
  readonly VITE_CLARITY_PROJECT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
