/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_DAPPLOOKER_API_KEY: string;
  readonly REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT: string;
  readonly REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}