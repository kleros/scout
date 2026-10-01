import React, { useRef, useState } from "react";
import styled, { css } from "styled-components";

import { useLocation, useNavigate } from "react-router-dom";
import { useClickAway } from "react-use";

import { landscapeStyle } from "styles/landscapeStyle";

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

const Settings: React.FC<ISettings> = ({ toggleIsSettingsOpen, initialTab }) => {
  const containerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab ?? 0);
  useClickAway(containerRef, () => {
    toggleIsSettingsOpen();
    const search = new URLSearchParams(location.search);
    const hadNotifyFlag = search.has("notify");
    search.delete("notify");
    if (location.hash.includes("#notifications") || hadNotifyFlag) {
      const query = search.toString();
      navigate(`${location.pathname}${query ? `?${query}` : ""}`, { replace: true });
    }
  });

  return (
    <Container ref={containerRef}>
      <StyledSettingsText>Settings</StyledSettingsText>
      <Tabs role="tablist">
        {TABS.map((label, index) => (
          <Tab
            key={label}
            type="button"
            role="tab"
            aria-selected={tab === index}
            selected={tab === index}
            onClick={() => setTab(index)}
          >
            {label}
          </Tab>
        ))}
      </Tabs>
      {tab === 0 ? <General {...{ toggleIsSettingsOpen }} /> : <Notifications />}
    </Container>
  );
};

export default Settings;
