import React from "react";
import styled from "styled-components";

import { useAccount, useDisconnect } from "wagmi";

import Button from "components/Button";

import { ChainDisplay } from "components/ConnectWallet/AccountDisplay";
import { EnsureChain } from "components/EnsureChain";
import WalletAndProfile from "./WalletAndProfile";
import { ISettings } from "../../../index";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const StyledChainContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  :before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.success};
  }
  > label {
    color: ${({ theme }) => theme.white};
  }
`;

const StyledButton = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 8px;
`;

const EnsureChainContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px 32px 20px 32px;
`;

const UserContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const DisconnectWalletButton: React.FC = () => {
  const { disconnect } = useDisconnect();
  return <Button onClick={() => disconnect()}>Disconnect</Button>;
};

const General: React.FC<ISettings> = ({ toggleIsSettingsOpen }) => {
  const { address } = useAccount();

  return (
    <EnsureChainContainer>
      <EnsureChain>
        <Container>
          {address && (
            <UserContainer>
              <StyledChainContainer>
                <ChainDisplay />
              </StyledChainContainer>
              <WalletAndProfile {...{ toggleIsSettingsOpen }} />
              <StyledButton>
                <DisconnectWalletButton />
              </StyledButton>
            </UserContainer>
          )}
        </Container>
      </EnsureChain>
    </EnsureChainContainer>
  );
};

export default General;
