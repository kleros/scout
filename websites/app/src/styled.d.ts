import 'styled-components'
import type { darkTheme } from 'styles/themes'

type AppTheme = typeof darkTheme

// Types the theme that StyledComponentsProvider passes to every styled component.
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends AppTheme {}
}
