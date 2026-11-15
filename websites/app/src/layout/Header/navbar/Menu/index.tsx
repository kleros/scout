import React from "react";
import styled, { css } from "styled-components";

import HelpIcon from "svgs/menu-icons/help.svg";
// import NotificationsIcon from "svgs/menu-icons/notifications.svg";
import SettingsIcon from "svgs/menu-icons/settings.svg";

import { landscapeStyle } from "styles/landscapeStyle";

import LightButton from "components/LightButton";

import { IHelp, ISettings } from "../index";

const Container = styled.div`
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
    `
  )}
`;

const ButtonContainer = styled.div`
  min-height: 32px;
  display: flex;
  align-items: center;

  button {
    padding: 0px;
  }

  .button-text {
    display: block;
  }

  ${landscapeStyle(
    () => css`
      .button-text {
        display: none;
      }
    `
  )}
`;

interface IMenu {
  isMobileNavbar?: boolean;
  isHelpOpen?: boolean;
  isSettingsOpen?: boolean;
}

const Menu: React.FC<ISettings & IHelp & IMenu> = ({
  toggleIsHelpOpen,
  toggleIsSettingsOpen,
  isMobileNavbar,
  isHelpOpen = false,
  isSettingsOpen = false,
}) => {
  const buttons = [
    // { text: "Notifications", Icon: NotificationsIcon },
    {
      text: "Settings",
      Icon: SettingsIcon,
      onPress: () => toggleIsSettingsOpen(),
      isOpen: isSettingsOpen,
    },
    {
      text: "Help",
      Icon: HelpIcon,
      onPress: () => {
        toggleIsHelpOpen();
      },
      isOpen: isHelpOpen,
    },
  ];

  return (
    <Container>
      {buttons.map(({ text, Icon, onPress, isOpen }) => (
        <ButtonContainer key={text}>
          {/* The text is hidden on wide screens, so the name comes from aria-label. */}
          <LightButton
            {...{ text, onPress, Icon, isMobileNavbar }}
            aria-label={text}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          />
        </ButtonContainer>
      ))}
    </Container>
  );
};

export default Menu;
