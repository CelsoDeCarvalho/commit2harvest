/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_TOKEN?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_HARVEST_ACCOUNT_ID?: string;
  readonly VITE_HARVEST_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
