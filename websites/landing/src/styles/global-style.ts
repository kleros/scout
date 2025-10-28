import { createGlobalStyle } from 'styled-components'
import { responsiveSize } from './responsiveSize'

export const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Open Sans', sans-serif;
    margin: 0;
    line-height: 1.5;

    p {
      font-weight: 300;
      font-size: ${responsiveSize(20, 24)};
    }
  }

  .os-theme-dark {
    --os-handle-bg: #7186FF;
    --os-handle-bg-hover: #8A9AFF;
    --os-handle-bg-active: #5A70E5;
  }

  .react-loading-skeleton {
    --base-color: #7186FF;
    --highlight-color: #8A9AFF;
  }

  .ReactModal__Overlay {
    background-color: rgba(0, 0, 0, 0.8) !important;
  }
`
