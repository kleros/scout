import { createGlobalStyle } from 'styled-components'
import { responsiveSize } from './responsiveSize'

export const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Manrope', sans-serif;
    margin: 0;
    line-height: 1.5;

    p {
      font-weight: 300;
      font-size: ${responsiveSize(20, 24)};
    }
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Space Grotesk', sans-serif;
  }

  /* Text that only assistive technology reads */
  .visually-hidden {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
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
