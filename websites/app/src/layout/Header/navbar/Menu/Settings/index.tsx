import React, { useId } from "react";
import styled, { css } from "styled-components";

import { useLocation, useNavigate } from "react-router-dom";
import { useClickAway } from "react-use";

import { useDialog } from "hooks/useDialog";

import { landscapeStyle, headerPanelRight } from "styles/landscapeStyle";

import { ISettings } from "../../index";

import General from "./General";

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
      right: ${headerPanelRight};
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

const Settings: React.FC<ISettings> = ({ toggleIsSettingsOpen, initialTab }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const titleId = useId();
  const close = () => {
    toggleIsSettingsOpen(false);
    if (location.hash.includes("#notifications"))
      navigate(`${location.pathname}${location.search}`, { replace: true });
  };
  // Focus moves into the panel, Tab stays inside, Escape closes it and focus goes back to the button that opened it.
  const { ref, dialogProps } = useDialog(true, close);
  useClickAway(ref, close);

  return (
    <Container {...dialogProps} aria-labelledby={titleId}>
      <StyledSettingsText id={titleId}>Settings</StyledSettingsText>
      <General {...{ toggleIsSettingsOpen }} />
    </Container>
  );
};

export default Settings;
