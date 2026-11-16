import React from "react";
import styled, { css } from "styled-components";

import HelpIcon from "svgs/menu-icons/help.svg";
import NotificationsIcon from "svgs/menu-icons/notifications.svg";
import SettingsIcon from "svgs/menu-icons/settings.svg";

import { landscapeStyle } from "styles/landscapeStyle";

import LightButton from "components/LightButton";
import { NOTIFY_ENABLED } from "consts/notify";
import { useNotificationsInbox, useNotifyConfig, useNotifyProfile } from "hooks/useNotifications";

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

// Where only the bell's icon shows, its text stays for screen readers: it is
// the button's name ("Notifications (3 unread)").
const BellContainer = styled(ButtonContainer)`
  ${landscapeStyle(
    () => css`
      .button-text {
        display: block;
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
        border: 0;
      }
    `
  )}
`;

const BadgeAnchor = styled.div`
  position: relative;
  display: flex;
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: ${({ theme }) => theme.error};
  color: ${({ theme }) => theme.white};
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
`;

// svgr turns SVG imports into components; their type declarations still say string.
const BellIcon = NotificationsIcon as unknown as React.FC<React.SVGAttributes<SVGElement>>;

interface IMenu {
  isMobileNavbar?: boolean;
  toggleIsNotificationsOpen?: () => void;
}

/** The bell, with the unread count; hidden where the notification service isn't available. */
const NotificationsButton: React.FC<{ toggleIsNotificationsOpen: () => void; isMobileNavbar?: boolean }> = ({
  toggleIsNotificationsOpen,
  isMobileNavbar,
}) => {
  const config = useNotifyConfig();
  const profile = useNotifyProfile();
  const inbox = useNotificationsInbox(profile.data?.signedIn ? profile.data.address : undefined);
  if (!config.isSuccess) return null;
  const unread = inbox.data?.unread ?? profile.data?.unread ?? 0;
  return (
    <BellContainer>
      <BadgeAnchor>
        <LightButton
          text={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
          onClick={() => toggleIsNotificationsOpen()}
          Icon={BellIcon}
          isMobileNavbar={isMobileNavbar}
        />
        {unread > 0 ? <Badge aria-hidden>{unread > 99 ? "99+" : unread}</Badge> : null}
      </BadgeAnchor>
    </BellContainer>
  );
};

const Menu: React.FC<ISettings & IHelp & IMenu> = ({
  toggleIsHelpOpen,
  toggleIsSettingsOpen,
  toggleIsNotificationsOpen,
  isMobileNavbar,
}) => {
  const buttons = [
    {
      text: "Settings",
      Icon: SettingsIcon,
      onClick: () => toggleIsSettingsOpen(),
    },
    {
      text: "Help",
      Icon: HelpIcon,
      onClick: () => {
        toggleIsHelpOpen();
      },
    },
  ];

  return (
    <Container>
      {NOTIFY_ENABLED && toggleIsNotificationsOpen ? (
        <NotificationsButton {...{ toggleIsNotificationsOpen, isMobileNavbar }} />
      ) : null}
      {buttons.map(({ text, Icon, onClick }) => (
        <ButtonContainer key={Icon}>
          <LightButton {...{ text, onClick, Icon, isMobileNavbar }} />
        </ButtonContainer>
      ))}
    </Container>
  );
};

export default Menu;
