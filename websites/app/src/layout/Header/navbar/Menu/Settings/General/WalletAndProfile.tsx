import React from "react";
import styled from "styled-components";
import { useAccount } from "wagmi";

import { hoverLongTransitionTiming } from "styles/commonStyles";

import ArrowIcon from "svgs/icons/arrow.svg";

import { AddressOrName, IdenticonOrAvatar } from "components/ConnectWallet/AccountDisplay";
import { StyledArrowLink } from "components/StyledArrowLink";
import { ISettings } from "../../../index";

const Container = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 32px;
  gap: 24px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 30px;

  > label {
    color: ${({ theme }) => theme.white};
    font-size: 16px;
    font-weight: 600;
  }

  :hover {
    background-color: ${({ theme }) => theme.lightGrey};
  }
`;

const AvatarAndAddressContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
`;

const ReStyledArrowLink = styled(StyledArrowLink)`
  font-size: 14px;
  color: ${({ theme }) => theme.white};

  > svg {
    height: 14px;
    width: 14px;
    fill: ${({ theme }) => theme.white};
    path {
      fill: ${({ theme }) => theme.white};
    }
  }

  &:hover {
    color: ${({ theme }) => theme.secondaryText};
    svg path {
      fill: ${({ theme }) => theme.secondaryText};
    }
  }
`;

const WalletAndProfile: React.FC<ISettings> = ({ toggleIsSettingsOpen }) => {
  const { address } = useAccount();

  return (
    <Container>
      <AvatarAndAddressContainer>
        <IdenticonOrAvatar />
        <AddressOrName />
      </AvatarAndAddressContainer>
      <ReStyledArrowLink
        to={address ? `/activity/ongoing?userAddress=${address.toLowerCase()}` : "/activity"}
        onClick={toggleIsSettingsOpen}
      >
        My Activity <ArrowIcon />
      </ReStyledArrowLink>
    </Container>
  );
};
export default WalletAndProfile;
