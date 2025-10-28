import { useAccount, useChainId } from 'wagmi';
import { 
  useWriteKlerosCurateAddItem,
  useWriteKlerosCurateRemoveItem,
  useWriteKlerosCurateChallengeRequest,
  useWriteKlerosCurateSubmitEvidence,
  useReadKlerosCurateGetItemInfo,
  useReadKlerosCurateGetRequestInfo,
  useSimulateKlerosCurateAddItem,
  useSimulateKlerosCurateRemoveItem,
  useSimulateKlerosCurateChallengeRequest,
  useSimulateKlerosCurateSubmitEvidence,
} from './generated';
import { registryAddresses, RegistryType } from '../../consts/contracts';
import { REFETCH_INTERVAL } from '../queries/consts';

export const useKlerosCurateItemInfo = (itemId: `0x${string}`, registryType: RegistryType) => {
  const address = registryAddresses[registryType];

  return useReadKlerosCurateGetItemInfo({
    address,
    args: [itemId],
    query: { 
      refetchInterval: REFETCH_INTERVAL,
      enabled: !!itemId && !!address,
    },
  });
};

export const useKlerosCurateRequestInfo = (
  itemId: `0x${string}`, 
  requestId: bigint, 
  registryType: RegistryType
) => {
  const address = registryAddresses[registryType];

  return useReadKlerosCurateGetRequestInfo({
    address,
    args: [itemId, requestId],
    query: { 
      refetchInterval: REFETCH_INTERVAL,
      enabled: !!itemId && requestId !== undefined && !!address,
    },
  });
};

// Write hooks with simulation
export const useAddItemToRegistry = (registryType: RegistryType) => {
  const registryAddress = registryAddresses[registryType];

  const simulate = useSimulateKlerosCurateAddItem();
  const write = useWriteKlerosCurateAddItem();

  return {
    simulate: (item: string, value: bigint) => 
      simulate.mutateAsync({
        address: registryAddress,
        args: [item],
        value,
      }),
    write: write.writeContract,
    isLoading: write.isPending || simulate.isPending,
    error: write.error || simulate.error,
  };
};

export const useRemoveItemFromRegistry = (registryType: RegistryType) => {
  const registryAddress = registryAddresses[registryType];

  const simulate = useSimulateKlerosCurateRemoveItem();
  const write = useWriteKlerosCurateRemoveItem();

  return {
    simulate: (itemId: `0x${string}`, evidence: string, value: bigint) =>
      simulate.mutateAsync({
        address: registryAddress,
        args: [itemId, evidence],
        value,
      }),
    write: write.writeContract,
    isLoading: write.isPending || simulate.isPending,
    error: write.error || simulate.error,
  };
};

export const useChallengeRequest = (registryType: RegistryType) => {
  const registryAddress = registryAddresses[registryType];

  const simulate = useSimulateKlerosCurateChallengeRequest();
  const write = useWriteKlerosCurateChallengeRequest();

  return {
    simulate: (itemId: `0x${string}`, evidence: string, value: bigint) =>
      simulate.mutateAsync({
        address: registryAddress,
        args: [itemId, evidence],
        value,
      }),
    write: write.writeContract,
    isLoading: write.isPending || simulate.isPending,
    error: write.error || simulate.error,
  };
};

export const useSubmitEvidence = (registryType: RegistryType) => {
  const registryAddress = registryAddresses[registryType];

  const simulate = useSimulateKlerosCurateSubmitEvidence();
  const write = useWriteKlerosCurateSubmitEvidence();

  return {
    simulate: (itemId: `0x${string}`, evidence: string) =>
      simulate.mutateAsync({
        address: registryAddress,
        args: [itemId, evidence],
      }),
    write: write.writeContract,
    isLoading: write.isPending || simulate.isPending,
    error: write.error || simulate.error,
  };
};