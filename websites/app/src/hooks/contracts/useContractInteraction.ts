import { useState, useCallback } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { wagmiAdapter } from '../../context/Web3Provider';
import { wrapWithToast, WrapWithToastReturnType } from '../../utils/wrapWithToast';
import { Address, ContractFunctionArgs, ContractFunctionName, Abi } from 'viem';

interface UseContractInteractionParams<
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>
> {
  address: Address;
  abi: TAbi;
  functionName: TFunctionName;
  args?: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>;
  value?: bigint;
  enabled?: boolean;
}

export const useContractInteraction = <
  TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>
>({
  address,
  abi,
  functionName,
  args,
  value,
  enabled = true,
}: UseContractInteractionParams<TAbi, TFunctionName>) => {
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const execute = useCallback(async (): Promise<WrapWithToastReturnType> => {
    if (!walletClient || !publicClient || !enabled) {
      return { status: false };
    }

    setIsLoading(true);

    try {
      // First simulate the contract call
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address,
        abi,
        functionName,
        args,
        value,
      });

      // Then execute with toast wrapper
      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
      );

      return result;
    } catch (error) {
      console.error('Contract interaction failed:', error);
      return { status: false };
    } finally {
      setIsLoading(false);
    }
  }, [address, abi, functionName, args, value, enabled, walletClient, publicClient]);

  return {
    execute,
    isLoading,
  };
};