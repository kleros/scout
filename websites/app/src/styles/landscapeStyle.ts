import { css, DefaultTheme, FlattenInterpolation, ThemeProps } from "styled-components";
import { responsiveSize } from "./responsiveSize";

export const MAX_WIDTH_LANDSCAPE = "1400px";

export const BREAKPOINT_LANDSCAPE = 900;

// Below 1234px the absolutely-centered desktop nav gets squeezed under 50% of HeaderContainer,
// which makes flex children shrink and text wraps inside multi-word links (My Profile, etc.).
// At/above 1234px the desktop header renders; below it, the hamburger header takes over.
export const BREAKPOINT_HEADER_DESKTOP = 1234;

/**
 * `right` offset that lines a header panel (Help, Settings) up with the right edge of the header's content,
 * which is centred and capped at MAX_WIDTH_LANDSCAPE with a responsive side padding.
 */
export const headerPanelRight = `calc(max(0px, (100vw - ${MAX_WIDTH_LANDSCAPE}) / 2) + ${responsiveSize(0, 48)})`;

export const landscapeStyle = (styleFn: () => FlattenInterpolation<ThemeProps<DefaultTheme>>) => css`
  @media (min-width: ${BREAKPOINT_LANDSCAPE}px) {
    ${() => styleFn()}
  }
`;
