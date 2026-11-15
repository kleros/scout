import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { wagmiAdapter } from '../../context/Web3Provider';
import { wrapWithToast } from '../../utils/wrapWithToast';
import { Address } from 'viem';
import { gnosis } from 'viem/chains';
import type { Id } from 'react-toastify';
import { klerosCurateAbi } from './generated';
import { DepositParams } from '../../utils/fetchRegistryDeposits';
import { DEFAULT_CHAIN } from '../../consts/chains';

export const WRONG_NETWORK_MESSAGE = 'Your wallet is on another network. Switch it to Gnosis, then try again.';

/**
 * Kleros' LightBatchWithdraw on Gnosis (verified on Sourcify, full match): withdraws a contributor's
 * appeal fee reimbursements and rewards from every round of an item's requests in one transaction,
 * by calling the registry's withdrawFeesAndRewards for each. The address Curate uses for Light lists.
 */
export const LIGHT_BATCH_WITHDRAW_ADDRESS = '0x36B00c87553330E4351ED0CB287ed3917c12a197' as const;

export const lightBatchWithdrawAbi = [
  {
    type: 'function',
    name: 'batchRequestWithdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_address', type: 'address' },
      { name: '_contributor', type: 'address' },
      { name: '_itemID', type: 'bytes32' },
      { name: '_cursor', type: 'uint256' },
      { name: '_count', type: 'uint256' },
      { name: '_roundCursor', type: 'uint256' },
      { name: '_roundCount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

/**
 * Scout's registries only exist on Gnosis. Refuse to prepare or send anything while the wallet is
 * on another network, instead of sending a transaction to an address that is empty there.
 */
const assertWalletOnGnosis = async (walletClient: { getChainId: () => Promise<number> }) => {
  const chainId = await walletClient.getChainId();
  if (chainId !== DEFAULT_CHAIN) throw new Error(WRONG_NETWORK_MESSAGE);
};

/** Optional: continue an existing progress toast (see progressToast) instead of starting a new one. */
export interface TxOptions {
  toastId?: Id;
}

export const useCurateInteractions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const addItem = useCallback(async (
    registryAddress: Address,
    itemData: string,
    depositParams: DepositParams,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const value = BigInt(depositParams.arbitrationCost + depositParams.submissionBaseDeposit);
      
      // Simulate the contract call first
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'addItem',
        args: [itemData],
        value,
        account: address,
      });

      // Execute with toast wrapper
      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  const removeItem = useCallback(async (
    registryAddress: Address,
    itemId: string,
    evidence: string,
    depositParams: DepositParams,
    arbitrationCost: bigint,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const value = arbitrationCost + BigInt(depositParams.removalBaseDeposit);
      
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'removeItem',
        args: [itemId as `0x${string}`, evidence],
        value,
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  const challengeRequest = useCallback(async (
    registryAddress: Address,
    itemId: string,
    evidence: string,
    challengeDeposit: bigint,
    arbitrationCost: bigint,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const value = arbitrationCost + challengeDeposit;
      
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'challengeRequest',
        args: [itemId as `0x${string}`, evidence],
        value,
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error challenging request:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  const submitEvidence = useCallback(async (
    registryAddress: Address,
    itemId: string,
    evidence: string,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'submitEvidence',
        args: [itemId as `0x${string}`, evidence],
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error submitting evidence:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  const fundAppeal = useCallback(async (
    registryAddress: Address,
    itemId: string,
    side: number,
    value: bigint,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'fundAppeal',
        args: [itemId as `0x${string}`, side],
        value,
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error funding appeal:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  const executeRequest = useCallback(async (
    registryAddress: Address,
    itemId: string,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'executeRequest',
        args: [itemId as `0x${string}`],
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error executing request:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  /**
   * Withdraws the connected wallet's appeal reimbursements and rewards for an item, through the
   * batch withdrawer: requests from the first one, `requestCount` of them (0 = all), every round of
   * each. The registry refuses a withdrawal from a request still under dispute, so while the latest
   * request is open the caller passes the number of requests before it.
   */
  const withdrawRewards = useCallback(async (
    registryAddress: Address,
    itemId: string,
    requestCount: number,
    txOptions?: TxOptions
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      await assertWalletOnGnosis(walletClient);
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        chainId: DEFAULT_CHAIN,
        address: LIGHT_BATCH_WITHDRAW_ADDRESS,
        abi: lightBatchWithdrawAbi,
        functionName: 'batchRequestWithdraw',
        args: [registryAddress, address, itemId as `0x${string}`, 0n, BigInt(requestCount), 0n, 0n],
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract({ ...request, chain: gnosis }),
        publicClient,
        { toastId: txOptions?.toastId }
      );

      return result;
    } catch (error) {
      console.error('Error withdrawing rewards:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, publicClient, address]);

  return {
    addItem,
    removeItem,
    challengeRequest,
    submitEvidence,
    fundAppeal,
    executeRequest,
    withdrawRewards,
    isLoading,
  };
};