import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  :root {
    --toastify-color-info: ${({ theme }) => theme.klerosUIComponentsPrimaryBlue};
    --toastify-color-success: ${({ theme }) => theme.klerosUIComponentsSuccess};
    --toastify-color-warning: ${({ theme }) => theme.klerosUIComponentsWarning};
    --toastify-color-error: ${({ theme }) => theme.klerosUIComponentsError};
  }

  .react-loading-skeleton {
    z-index: 0;
    --base-color: ${({ theme }) => theme.klerosUIComponentsSkeletonBackground}; !important;
    --highlight-color: ${({ theme }) => theme.klerosUIComponentsSkeletonHighlight}; !important;
  }

  :root {
    /* The app is dark only: native scrollbars, select popups and autofill follow. */
    color-scheme: dark;
  }

  body {
    font-family: "Manrope", sans-serif;
    margin: 0px;
    background-color: ${({ theme }) => theme.klerosUIComponentsLightBackground};
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: "Space Grotesk", sans-serif;
  }

  html {
    box-sizing: border-box;
    /* Keeps anchors and keyboard focus clear of the 64px header. */
    scroll-padding-top: 80px;
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }

  /* Keyboard users get a visible ring on every focusable element; mouse and touch users do not. */
  :focus:not(:focus-visible) {
    outline: none;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.klerosUIComponentsPrimaryBlue};
    outline-offset: 2px;
  }

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

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  .ReactModal__Overlay {
    background-color: ${({ theme }) => theme.tooltipBackground} !important;
  }

  h1 {
    margin: 0 0 16px 0;
    font-weight: 600;
    font-size: 24px;
    line-height: 32px;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  }

  h2 {
    margin: 0 0 16px 0;
    font-weight: 400;
    font-size: 24px;
    line-height: 32px;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  }

  h3 {
    margin: 0 0 16px 0;
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  }

  p {
    font-weight: 400;
    font-size: 16px;
    line-height: 24px;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  }

  textarea {
    font-family: "Manrope", sans-serif;
    font-size: 14px;
  }

  small {
    font-weight: 600;
    font-size: 14px;
    line-height: 18px;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
  }

  label {
    font-weight: 400;
    font-size: 14px;
    line-height: 18px;
    color: ${({ theme }) => theme.klerosUIComponentsSecondaryText};
  }

  a {
    font-weight: 400;
    font-size: 14px;
    text-decoration: none;
    color: ${({ theme }) => theme.klerosUIComponentsPrimaryBlue};
  }

  hr {
    opacity: 1;
    border: 1px solid ${({ theme }) => theme.klerosUIComponentsStroke};
  }

  svg, img {
    display: inline-block;
    vertical-align: middle;
  visibility: visible;

  }

  ul, ol {
    li {
      color: ${({ theme }) => theme.klerosUIComponentsPrimaryText};
    }
  }

  [role="tooltip"] {
    background-color: ${({ theme }) => theme.backgroundThree} !important;
    color: ${({ theme }) => theme.primaryText} !important;
    padding: 8px 12px !important;
    border-radius: 8px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    box-shadow: ${({ theme }) => theme.shadowTooltip} !important;
    z-index: 9999 !important;
    border: none !important;
  }
`;
