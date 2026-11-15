// Types for the files Vite imports as modules: SVGs become React components (vite-plugin-svgr, see
// vite.config.js) and images become their URL.
declare module '*.svg' {
  import * as React from 'react'
  const SvgComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default SvgComponent
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}
