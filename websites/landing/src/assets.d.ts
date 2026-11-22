// Types for the re-encoded images Vite imports as modules: each import is the file's URL.
declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}
