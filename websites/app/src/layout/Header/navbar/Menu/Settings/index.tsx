import React, { useRef, useState } from "react";
import styled, { css } from "styled-components";

import { useLocation, useNavigate } from "react-router-dom";
import { useClickAway } from "react-use";

import { landscapeStyle } from "styles/landscapeStyle";

import { NOTIFY_ENABLED } from "consts/notify";
import { useNotifyConfig } from "hooks/useNotifications";

import { ISettings } from "../../index";

import General from "./General";
import Notifications from "./Notifications";

const Container = styled.div`
  display: flex;
  position: absolute;
  max-height: 80vh;
  overflow-y: auto;
  background-color: ${({ theme }) => theme.lightBackground};
  flex-direction: column;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  border: 0.1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  overflow-y: auto;

  ${landscapeStyle(
    () => css`
      margin-top: 64px;
      top: 0;
      right: 0;
      left: auto;
      transform: none;
    `
  )}
`;

const StyledSettingsText = styled.div`
  display: flex;
  justify-content: center;
  font-size: 24px;
  color: ${({ theme }) => theme.primaryText};
  margin-top: 24px;
`;

const Tabs = styled.div`
  display: flex;
  justify-content: center;
  gap: 4px;
  margin: 16px 24px 0;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
`;

const Tab = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
  border-bottom: 2px solid ${({ theme, selected }) => (selected ? theme.secondaryBlue : "transparent")};
  margin-bottom: -1px;

  &:hover {
    color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.primaryText)};
  }
`;

const TABS = ["General", "Notifications"];

/** General and Notifications, once the notification service has answered; General alone otherwise. */
const SettingsTabs: React.FC<ISettings> = ({ toggleIsSettingsOpen, initialTab }) => {
  const config = useNotifyConfig();
  const [tab, setTab] = useState(initialTab ?? 0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  if (!config.isSuccess) return <General {...{ toggleIsSettingsOpen }} />;

  // Arrow keys move between tabs, as in any tab list.
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(next);
    tabs.current[next]?.focus();
  };

  return (
    <>
      <Tabs role="tablist" aria-label="Settings">
        {TABS.map((label, index) => (
          <Tab
            key={label}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            id={`settings-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={tab === index}
            aria-controls={`settings-panel-${index}`}
            tabIndex={tab === index ? 0 : -1}
            selected={tab === index}
            onClick={() => setTab(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {label}
          </Tab>
        ))}
      </Tabs>
      <div role="tabpanel" id={`settings-panel-${tab}`} aria-labelledby={`settings-tab-${tab}`}>
        {tab === 0 ? <General {...{ toggleIsSettingsOpen }} /> : <Notifications />}
      </div>
    </>
  );
};

const Settings: React.FC<ISettings> = ({ toggleIsSettingsOpen, initialTab }) => {
  const containerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  useClickAway(containerRef, () => {
    toggleIsSettingsOpen();
    const search = new URLSearchParams(location.search);
    // The email confirmation page sends people here with ?notify=…; it goes with #notifications.
    if (NOTIFY_ENABLED && search.has("notify")) {
      search.delete("notify");
      const query = search.toString();
      navigate(`${location.pathname}${query ? `?${query}` : ""}`, { replace: true });
    } else if (location.hash.includes("#notifications"))
      navigate(`${location.pathname}${location.search}`, { replace: true });
  });

  return (
    <Container ref={containerRef}>
      <StyledSettingsText>Settings</StyledSettingsText>
      {NOTIFY_ENABLED ? (
        <SettingsTabs {...{ toggleIsSettingsOpen, initialTab }} />
      ) : (
        <General {...{ toggleIsSettingsOpen }} />
      )}
    </Container>
  );
};

export default Settings;
