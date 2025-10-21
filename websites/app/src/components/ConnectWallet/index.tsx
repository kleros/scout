import React, { useCallback } from "react";
import styled from "styled-components";

import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";

import Button from "components/Button";

import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from "consts/chains";

import AccountDisplay from "./AccountDisplay";

const StyledButton = styled(Button)`
  color: ${({ theme }) => theme.black};

  &:disabled {
    background: #666666;
    color: #999999;
    cursor: not-allowed;
  }
`;

export const SwitchChainButton: React.FC<{ className?: string }> = ({ className }) => {
  // TODO isLoading is not documented, but exists in the type, might have changed to isPending
  const { switchChain, isLoading } = useSwitchChain();
  const handleSwitch = useCallback(() => {
    if (!switchChain) {
      console.error("Cannot switch network. Please do it manually.");
      return;
    }
    try {
      switchChain({ chainId: DEFAULT_CHAIN });
    } catch (err) {
      console.error(err);
    }
  }, [switchChain]);
  return (
    <StyledButton
      className={className}
      disabled={isLoading}
      onClick={handleSwitch}
    >
      {isLoading ? "Switching..." : `Switch to ${SUPPORTED_CHAINS[DEFAULT_CHAIN].name}`}
    </StyledButton>
  );
};

const ConnectButton: React.FC<{ className?: string }> = ({ className }) => {
  const { open } = useAppKit();
  const { open: isOpen } = useAppKitState();
  return (
    <StyledButton
      className={className}
      disabled={isOpen}
      onClick={async () => open({ view: "Connect" })}
    >
      Connect
    </StyledButton>
  );
};

const ConnectWallet: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected, chainId } = useAccount();

  if (isConnected) {
    if (chainId !== DEFAULT_CHAIN) {
      return <SwitchChainButton {...{ className }} />;
    } else return <AccountDisplay />;
  } else return <ConnectButton {...{ className }} />;
};

export default ConnectWallet;
