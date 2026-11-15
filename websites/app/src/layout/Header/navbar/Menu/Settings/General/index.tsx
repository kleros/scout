import React from "react";
import styled from "styled-components";

import { useAccount, useDisconnect } from "wagmi";

import { DEFAULT_CHAIN } from "consts/chains";

import Button from "components/Button";

import ConnectWallet, { SwitchChainButton } from "components/ConnectWallet";
import { ChainDisplay } from "components/ConnectWallet/AccountDisplay";
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

const SwitchChainContainer = styled.div`
  display: flex;
  justify-content: center;
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
  return <Button type="button" onClick={() => disconnect()}>Disconnect</Button>;
};

const General: React.FC<ISettings> = ({ toggleIsSettingsOpen }) => {
  const { address, chainId } = useAccount();

  return (
    <EnsureChainContainer>
      {address ? (
        <Container>
          <UserContainer>
            {/* On another network the account and Disconnect stay; only the network line becomes the switch. */}
            {chainId === DEFAULT_CHAIN ? (
              <StyledChainContainer>
                <ChainDisplay />
              </StyledChainContainer>
            ) : (
              <SwitchChainContainer>
                <SwitchChainButton />
              </SwitchChainContainer>
            )}
            <WalletAndProfile {...{ toggleIsSettingsOpen }} />
            <StyledButton>
              <DisconnectWalletButton />
            </StyledButton>
          </UserContainer>
        </Container>
      ) : (
        <ConnectWallet />
      )}
    </EnsureChainContainer>
  );
};

export default General;
