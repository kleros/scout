import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import PaperClip from "svgs/icons/paperclip.svg";
import Arrow from "svgs/icons/arrow-left.svg";

import { responsiveSize } from "styles/responsiveSize";
import { hoverShortTransitionTiming } from "styles/commonStyles";
import { isAttachmentOpenedInApp } from "hooks/useAttachment";
import { registryDisplayNames } from "utils/items";

import PolicyHistoryModal from "./PolicyHistoryModal";

const ATTACHMENT_PARAMS = ['attachment', 'policyTx', 'isPolicy'];

// On a phone the title and the actions do not fit on one line: the actions move below the
// title as a block, instead of either of them breaking mid-phrase.
const Container = styled.div`
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 4px 16px;
  margin-bottom: 12px;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`;

const Title = styled.h1`
  margin: 0px;
  font-size: ${responsiveSize(16, 24)};
  color: ${({ theme }) => theme.secondaryBlue};
`;

const StyledPaperClip = styled(PaperClip)`
  width: ${responsiveSize(16, 24)};
  height: ${responsiveSize(16, 24)};
  path {
    fill: ${({ theme }) => theme.secondaryBlue};
  }
`;

const StyledArrow = styled(Arrow)`
  path {
    fill: ${({ theme }) => theme.secondaryBlue};
    ${hoverShortTransitionTiming}
  }
`;

const RightActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  white-space: nowrap;
`;

const PolicyHistoryButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`;

const ReturnButton = styled(Link)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.secondaryBlue};
      ${hoverShortTransitionTiming}
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`;

const Header: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { registryName } = useParams<{ registryName: string }>();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isPolicy = searchParams.has('isPolicy') || searchParams.has('policyTx');
  const registryDisplayName = registryName ? registryDisplayNames[registryName] : undefined;
  const title = isPolicy && registryDisplayName ? `${registryDisplayName} policy` : isPolicy ? 'Policy' : 'File';

  // The page without the attachment: the target of Return, also for a new tab or window.
  const returnTo = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    ATTACHMENT_PARAMS.forEach((key) => params.delete(key));
    const search = params.toString();
    return { pathname: location.pathname, search: search ? `?${search}` : '' };
  }, [searchParams, location.pathname]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if user is trying to open in new tab (Ctrl+Click, Cmd+Click, or middle click)
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      return;
    }

    e.preventDefault();

    // Opened by the app: step back to the entry it was opened from, as the browser Back button does.
    if (isAttachmentOpenedInApp(location.state)) {
      navigate(-1);
      return;
    }

    // Deep link or new tab: there is no entry to go back to, so remove the attachment params.
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      ATTACHMENT_PARAMS.forEach((key) => newParams.delete(key));
      return newParams;
    }, { replace: true });
  };

  return (
    <>
      <Container>
        <TitleContainer>
          <StyledPaperClip />
          <Title>{title}</Title>
        </TitleContainer>
        <RightActions>
          {isPolicy ? (
            <PolicyHistoryButton
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsHistoryOpen(true)}
            >
              Previous Policies
            </PolicyHistoryButton>
          ) : null}
          <ReturnButton to={returnTo} onClick={handleClick}>
            <StyledArrow />
            Return
          </ReturnButton>
        </RightActions>
      </Container>
      {isHistoryOpen && (
        <PolicyHistoryModal onClose={() => setIsHistoryOpen(false)} />
      )}
    </>
  );
};

export default Header;
