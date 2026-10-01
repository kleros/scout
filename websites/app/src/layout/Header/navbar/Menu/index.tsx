import React from "react";
import styled, { css } from "styled-components";

import HelpIcon from "svgs/menu-icons/help.svg";
import NotificationsIcon from "svgs/menu-icons/notifications.svg";
import SettingsIcon from "svgs/menu-icons/settings.svg";

import { landscapeStyle } from "styles/landscapeStyle";

import LightButton from "components/LightButton";
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

interface IMenu {
  isMobileNavbar?: boolean;
  toggleIsNotificationsOpen?: () => void;
}

/** Unread count for the bell; hidden where the notification service isn't deployed. */
const useUnread = () => {
  const config = useNotifyConfig();
  const profile = useNotifyProfile();
  const inbox = useNotificationsInbox(profile.data?.signedIn ? profile.data.address : undefined);
  return { available: config.isSuccess, unread: inbox.data?.unread ?? profile.data?.unread ?? 0 };
};

const Menu: React.FC<ISettings & IHelp & IMenu> = ({
  toggleIsHelpOpen,
  toggleIsSettingsOpen,
  toggleIsNotificationsOpen,
  isMobileNavbar,
}) => {
  const { available, unread } = useUnread();
  const buttons = [
    ...(available && toggleIsNotificationsOpen
      ? [
          {
            text: unread > 0 ? `Notifications (${unread} unread)` : "Notifications",
            Icon: NotificationsIcon,
            onClick: () => toggleIsNotificationsOpen(),
            badge: unread,
          },
        ]
      : []),
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
      {buttons.map(({ text, Icon, onClick, ...rest }) => {
        const badge = ("badge" in rest ? rest.badge : 0) ?? 0;
        return (
          <ButtonContainer key={text}>
            <BadgeAnchor>
              <LightButton {...{ text, onClick, Icon, isMobileNavbar }} />
              {badge > 0 ? <Badge aria-hidden>{badge > 99 ? "99+" : badge}</Badge> : null}
            </BadgeAnchor>
          </ButtonContainer>
        );
      })}
    </Container>
  );
};

export default Menu;
