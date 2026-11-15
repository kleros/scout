import React from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";
import { hoverShortTransitionTiming } from "styles/commonStyles";

import { Button } from "@kleros/ui-components-library";

const StyledButton = styled(Button)<{ isMobileNavbar?: boolean }>`
  ${hoverShortTransitionTiming}
  background-color: transparent;
  padding: 8px !important;
  border-radius: 7px;
  .button-text {
    color: ${({ theme }) => theme.primaryText};
    font-weight: 400;
  }
  .button-svg {
    fill: ${({ theme, isMobileNavbar }) => (isMobileNavbar ? theme.secondaryText : `${theme.white}BF`)} !important;
  }

  &:hover {
    .button-svg {
      fill: ${({ theme, isMobileNavbar }) => (isMobileNavbar ? theme.primaryText : `${theme.white}`)} !important;
    }
    background-color: ${({ theme }) => theme.whiteLowOpacityStrong};
  }

  ${landscapeStyle(
    () => css`
      padding: 8px !important;
      .button-svg {
        margin-right: 0;
      }
    `
  )}
`;

type SvgIcon = React.FC<React.SVGAttributes<SVGElement>>;

interface ILightButton {
  text: string;
  /** An svgr component (`*.svg` imports are typed as strings by vite/client). */
  Icon?: SvgIcon | string;
  /** Runs on mouse, touch, Enter and Space (the library button only fires onClick for pointer clicks). */
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  isMobileNavbar?: boolean;
  /** Accessible name; needed whenever the text is empty or hidden (icon-only buttons). */
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: boolean | "dialog" | "menu" | "listbox" | "tree" | "grid";
  "aria-controls"?: string;
}

const LightButton: React.FC<ILightButton> = ({ text, Icon, onPress, disabled, className, isMobileNavbar, ...aria }) => (
  <StyledButton
    variant="primary"
    small
    {...{ text, className, isMobileNavbar }}
    Icon={Icon as SvgIcon | undefined}
    {...aria}
    onPress={onPress ? () => onPress() : undefined}
    isDisabled={disabled}
  />
);

export default LightButton;
