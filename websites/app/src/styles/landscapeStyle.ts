import { css, DefaultTheme, FlattenInterpolation, ThemeProps } from "styled-components";

export const MAX_WIDTH_LANDSCAPE = "1308px";

export const BREAKPOINT_LANDSCAPE = 900;

export const landscapeStyle = (styleFn: () => FlattenInterpolation<ThemeProps<DefaultTheme>>) => css`
  @media (min-width: ${BREAKPOINT_LANDSCAPE}px) {
    ${() => styleFn()}
  }
`;
