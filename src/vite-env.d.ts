/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_REAL_ONLY?: string;
    readonly VITE_GEMINI_PROXY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
