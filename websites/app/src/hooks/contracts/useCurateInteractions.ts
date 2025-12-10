import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { simulateContract } from '@wagmi/core';
import { wagmiAdapter } from '../../context/Web3Provider';
import { wrapWithToast } from '../../utils/wrapWithToast';
import { Address } from 'viem';
import { klerosCurateAbi } from './generated';
import { DepositParams } from '../../utils/fetchRegistryDeposits';

export const useCurateInteractions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const addItem = useCallback(async (
    registryAddress: Address,
    itemData: string,
    depositParams: DepositParams
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const value = BigInt(depositParams.arbitrationCost + depositParams.submissionBaseDeposit);
      
      // Simulate the contract call first
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'addItem',
        args: [itemData],
        value,
        account: address,
      });

      // Execute with toast wrapper
      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
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
    arbitrationCost: bigint
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const value = arbitrationCost + BigInt(depositParams.removalBaseDeposit);
      
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'removeItem',
        args: [itemId as `0x${string}`, evidence],
        value,
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
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
    arbitrationCost: bigint
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const value = arbitrationCost + challengeDeposit;
      
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'challengeRequest',
        args: [itemId as `0x${string}`, evidence],
        value,
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
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
    evidence: string
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'submitEvidence',
        args: [itemId as `0x${string}`, evidence],
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
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
    value: bigint
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'fundAppeal',
        args: [itemId as `0x${string}`, side],
        value,
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
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
    itemId: string
  ) => {
    if (!walletClient || !publicClient || !address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    try {
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, {
        address: registryAddress,
        abi: klerosCurateAbi,
        functionName: 'executeRequest',
        args: [itemId as `0x${string}`],
        account: address,
      });

      const result = await wrapWithToast(
        async () => await walletClient.writeContract(request),
        publicClient
      );

      return result;
    } catch (error) {
      console.error('Error executing request:', error);
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
    isLoading,
  };
};