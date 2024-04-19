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
    --os-handle-bg: #9278D3;
    --os-handle-bg-hover: #B499E5;
    --os-handle-bg-active: #75BDAE;
  }

  .react-loading-skeleton {
    --base-color: #9277B1;
    --highlight-color: #A98BC9;
  }

`
