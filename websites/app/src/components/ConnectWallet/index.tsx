import React, { useCallback } from "react";
import styled from "styled-components";

import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";

import Button from "components/Button";

import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from "consts/chains";
import { isUserRejection } from "utils/parseWagmiError";
import { errorToast } from "utils/wrapWithToast";

import AccountDisplay from "./AccountDisplay";

const StyledButton = styled(Button)`
  color: ${({ theme }) => theme.black};

  &:disabled {
    background: ${({ theme }) => theme.buttonDisabled};
    color: ${({ theme }) => theme.buttonDisabledText};
    border: 1px solid ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
  }
`;

export const SwitchChainButton: React.FC<{ className?: string }> = ({ className }) => {
  const { switchChain, isPending } = useSwitchChain();
  const chainName = SUPPORTED_CHAINS[DEFAULT_CHAIN].name;
  const handleSwitch = useCallback(() => {
    switchChain(
      { chainId: DEFAULT_CHAIN },
      {
        onError: (error) => {
          console.error(error);
          // Declining in the wallet is a choice; anything else gets a way forward.
          if (!isUserRejection(error))
            errorToast(`Could not switch to ${chainName}. Switch the network in your wallet, then try again.`);
        },
      }
    );
  }, [switchChain, chainName]);
  return (
    <StyledButton
      type="button"
      className={className}
      disabled={isPending}
      onClick={handleSwitch}
    >
      {isPending ? "Switching..." : `Switch to ${chainName}`}
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
